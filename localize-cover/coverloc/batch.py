"""Asynchronous batch jobs (50% price) for OpenAI and Gemini.

OpenAI : JSONL (custom_id/method/url/body) -> /v1/files (purpose=batch)
         -> /v1/batches (24h window) -> output_file_id JSONL.
Gemini : JSONL ({key, request}) -> Files API upload
         -> models/{m}:batchGenerateContent -> responsesFile JSONL.

The request bodies are produced by core.build_request — identical to the
synchronous path, including the `store` flag.
"""
from __future__ import annotations

import fcntl
import json
import uuid
from datetime import datetime
from pathlib import Path

import httpx

from . import config, core, imaging, providers

OPENAI_DONE = {"completed", "failed", "expired", "cancelled"}
GEMINI_DONE = {"BATCH_STATE_SUCCEEDED", "BATCH_STATE_FAILED", "BATCH_STATE_CANCELLED", "BATCH_STATE_EXPIRED",
               "JOB_STATE_SUCCEEDED", "JOB_STATE_FAILED", "JOB_STATE_CANCELLED", "JOB_STATE_EXPIRED"}


def _manifest_path(job_id: str) -> Path:
    return config.BATCH_DIR / f"{job_id}.json"


def _save(job: dict) -> None:
    config.BATCH_DIR.mkdir(parents=True, exist_ok=True)
    tmp = _manifest_path(job["job_id"]).with_suffix(".tmp")
    tmp.write_text(json.dumps(job, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(_manifest_path(job["job_id"]))


def load(job_id: str) -> dict:
    return json.loads(_manifest_path(job_id).read_text(encoding="utf-8"))


def list_jobs() -> list[dict]:
    if not config.BATCH_DIR.exists():
        return []
    jobs = []
    for f in sorted(config.BATCH_DIR.glob("*.json"), reverse=True):
        try:
            jobs.append(json.loads(f.read_text(encoding="utf-8")))
        except ValueError:
            pass
    return jobs


def _task_to_dict(t: core.Task) -> dict:
    return {"id": t.id, "source": t.source, "target_lang": t.target_lang, "model": t.model,
            "opts": t.opts.to_dict()}


def _task_from_dict(d: dict) -> core.Task:
    return core.Task(d["source"], d["target_lang"], d["model"], core.Options(**d["opts"]), id=d["id"])


# ------------------------------------------------------------------ HTTP helpers

def _oa_headers() -> dict:
    return {"Authorization": f"Bearer {config.openai_key()}"}


def _gm_headers() -> dict:
    return {"x-goog-api-key": config.gemini_key() or ""}


def _check(r: httpx.Response) -> dict:
    try:
        j = r.json()
    except ValueError:
        raise providers.ProviderError(f"HTTP {r.status_code}: {r.text[:300]}")
    if r.status_code >= 400:
        raise providers.ProviderError(f"HTTP {r.status_code}: {providers._err(j.get('error', j))}")
    return j


# ------------------------------------------------------------------ submit

def submit(tasks: list[core.Task], label: str = "", cleanup: bool = True) -> dict:
    job_id = datetime.now().strftime("%Y%m%d-%H%M%S") + "-" + uuid.uuid4().hex[:4]
    run_dir = core.new_run_dir("batch" + (f"-{label}" if label else ""))
    groups: dict[tuple, dict] = {}
    for t in tasks:
        provider, path, body, plan, prompt = core.build_request(t)
        key = (provider, t.model, path)
        g = groups.setdefault(key, {"provider": provider, "model": t.model, "endpoint": path,
                                    "tasks": [], "lines": []})
        g["tasks"].append({**_task_to_dict(t), "plan": plan.to_dict(), "prompt": prompt})
        if provider == "openai":
            g["lines"].append({"custom_id": t.id, "method": "POST", "url": path, "body": body})
        else:
            g["lines"].append({"key": t.id, "request": body})

    job = {"job_id": job_id, "label": label, "created_at": datetime.now().isoformat(timespec="seconds"),
           "run_dir": str(run_dir), "status": "submitting", "groups": [],
           "cleanup_remote": cleanup}  # delete provider-side batch files once results are saved
    for g in groups.values():
        jsonl = "\n".join(json.dumps(line, ensure_ascii=False) for line in g.pop("lines")).encode()
        try:
            remote = _submit_openai(jsonl, g["endpoint"], job_id) if g["provider"] == "openai" \
                else _submit_gemini(jsonl, g["model"], job_id)
            g.update(remote_id=remote, status="submitted", error=None)
        except Exception as e:  # noqa: BLE001
            g.update(remote_id=None, status="submit_failed", error=str(e))
        g["input_bytes"] = len(jsonl)
        job["groups"].append(g)
    job["status"] = "submitted" if any(g["remote_id"] for g in job["groups"]) else "failed"
    _save(job)
    core.write_manifest(run_dir, {"kind": "batch", "batch_job": job_id,
                                  "created_at": job["created_at"]},
                        [{"id": t["id"], "status": "queued", "source": t["source"], "model": t["model"],
                          "target_lang": t["target_lang"]} for g in job["groups"] for t in g["tasks"]])
    return job


def _submit_openai(jsonl: bytes, endpoint: str, job_id: str) -> str:
    r = httpx.post(providers.OPENAI_BASE + "/v1/files", headers=_oa_headers(),
                   data={"purpose": "batch"}, files={"file": (f"{job_id}.jsonl", jsonl, "application/jsonl")},
                   timeout=600)
    fid = _check(r)["id"]
    r = httpx.post(providers.OPENAI_BASE + "/v1/batches", headers=_oa_headers(), timeout=60,
                   json={"input_file_id": fid, "endpoint": endpoint, "completion_window": "24h",
                         "metadata": {"app": "coverloc", "job": job_id}})
    return _check(r)["id"]


def _submit_gemini(jsonl: bytes, model: str, job_id: str) -> str:
    start = httpx.post("https://generativelanguage.googleapis.com/upload/v1beta/files",
                       headers={**_gm_headers(), "X-Goog-Upload-Protocol": "resumable",
                                "X-Goog-Upload-Command": "start",
                                "X-Goog-Upload-Header-Content-Length": str(len(jsonl)),
                                "X-Goog-Upload-Header-Content-Type": "application/jsonl",
                                "Content-Type": "application/json"},
                       json={"file": {"display_name": f"coverloc-{job_id}"}}, timeout=60)
    if start.status_code >= 400:
        _check(start)
    up_url = start.headers.get("x-goog-upload-url")
    if not up_url:
        raise providers.ProviderError("Gemini upload URL missing")
    r = httpx.post(up_url, headers={"X-Goog-Upload-Command": "upload, finalize", "X-Goog-Upload-Offset": "0",
                                    "Content-Length": str(len(jsonl))}, content=jsonl, timeout=600)
    file_name = _check(r)["file"]["name"]
    r = httpx.post(f"{providers.GEMINI_BASE}/models/{model}:batchGenerateContent", headers=_gm_headers(),
                   json={"batch": {"display_name": f"coverloc-{job_id}",
                                   "input_config": {"file_name": file_name}}}, timeout=60)
    return _check(r)["name"]


# ------------------------------------------------------------------ status / fetch

def refresh(job_id: str, fetch: bool = True) -> dict:
    """Poll every group; when a group finishes, download + finalize results.
    Serialized per job with an OS file lock so the CLI and the web app (or two
    browser tabs) can never fetch/finalize the same group twice."""
    config.BATCH_DIR.mkdir(parents=True, exist_ok=True)
    with open(config.BATCH_DIR / f"{job_id}.lock", "w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        try:
            return _refresh_locked(job_id, fetch)
        finally:
            fcntl.flock(lock, fcntl.LOCK_UN)


def _refresh_locked(job_id: str, fetch: bool) -> dict:
    job = load(job_id)  # re-read inside the lock: another process may have fetched
    run_dir = Path(job["run_dir"])
    for g in job["groups"]:
        if not g.get("remote_id") or g["status"] in ("fetched", "submit_failed"):
            continue
        try:
            if g["provider"] == "openai":
                _refresh_openai(g, run_dir, fetch)
            else:
                _refresh_gemini(g, run_dir, fetch)
        except Exception as e:  # noqa: BLE001
            g["poll_error"] = str(e)
            continue
        if g["status"] == "fetched" and job.get("cleanup_remote") and not g.get("cleanup"):
            g["cleanup"] = _cleanup_group(g)
    states = {g["status"] for g in job["groups"]}
    job["status"] = "done" if states <= {"fetched", "submit_failed", "failed"} else "in_progress"
    job["checked_at"] = datetime.now().isoformat(timespec="seconds")
    _save(job)
    _sync_run_manifest(job)
    return job


def _cleanup_group(g: dict) -> dict:
    """Results are saved locally -> remove the provider-side copies (images + prompts)."""
    from . import logs
    try:
        if g["provider"] == "openai":
            return logs.purge_openai_batch(g["remote_id"])
        return logs.purge_gemini_batch(g["remote_id"])
    except Exception as e:  # noqa: BLE001
        return {"error": str(e)}


def _refresh_openai(g: dict, run_dir: Path, fetch: bool) -> None:
    b = _check(httpx.get(f"{providers.OPENAI_BASE}/v1/batches/{g['remote_id']}", headers=_oa_headers(), timeout=60))
    g["remote_status"] = b["status"]
    g["counts"] = b.get("request_counts")
    if b["status"] not in OPENAI_DONE:
        g["status"] = "in_progress"
        return
    if not fetch:
        return
    results: dict[str, dict] = {}
    for fid_key in ("output_file_id", "error_file_id"):
        if b.get(fid_key):
            r = httpx.get(f"{providers.OPENAI_BASE}/v1/files/{b[fid_key]}/content", headers=_oa_headers(),
                          timeout=600)
            for line in r.text.splitlines():
                if line.strip():
                    o = json.loads(line)
                    results[o["custom_id"]] = o
    for td in g["tasks"]:
        o = results.get(td["id"])
        if not o:
            td["result"] = {"id": td["id"], "status": "error", "error": f"no result ({b['status']})"}
            continue
        resp = o.get("response") or {}
        body = resp.get("body") or {}
        if o.get("error") or resp.get("status_code", 200) >= 400:
            td["result"] = {"id": td["id"], "status": "error",
                            "error": providers._err(o.get("error") or body.get("error") or body)}
            continue
        td["result"] = _finalize(td, body, run_dir)
    g["status"] = "fetched"


def _refresh_gemini(g: dict, run_dir: Path, fetch: bool) -> None:
    b = _check(httpx.get(f"{providers.GEMINI_BASE}/{g['remote_id']}", headers=_gm_headers(), timeout=60))
    meta = b.get("metadata") or {}
    state = meta.get("state") or b.get("state")
    g["remote_status"] = state
    g["counts"] = meta.get("batchStats")
    if state not in GEMINI_DONE and not b.get("done"):
        g["status"] = "in_progress"
        return
    if not fetch:
        return
    resp = b.get("response") or meta.get("output") or {}
    results: dict[str, dict] = {}
    rf = resp.get("responsesFile")
    if rf:
        r = httpx.get(f"https://generativelanguage.googleapis.com/download/v1beta/{rf}:download",
                      params={"alt": "media"}, headers=_gm_headers(), timeout=600, follow_redirects=True)
        for line in r.text.splitlines():
            if line.strip():
                o = json.loads(line)
                results[o.get("key")] = o
    for o in ((resp.get("inlinedResponses") or {}).get("inlinedResponses") or []):
        results[(o.get("metadata") or {}).get("key")] = o
    for td in g["tasks"]:
        o = results.get(td["id"])
        if not o:
            td["result"] = {"id": td["id"], "status": "error", "error": f"no result ({state})"}
            continue
        if o.get("error"):
            td["result"] = {"id": td["id"], "status": "error", "error": providers._err(o["error"])}
            continue
        td["result"] = _finalize(td, o.get("response") or {}, run_dir)
    g["status"] = "fetched"


def _finalize(td: dict, body: dict, run_dir: Path) -> dict:
    task = _task_from_dict(td)
    try:
        img, usage, extra = core.parse_response(task, body)
        return core.finalize(task, imaging.Plan.from_dict(td["plan"]), img, usage, extra, run_dir,
                             batch=True, elapsed=None, prompt=td["prompt"])
    except Exception as e:  # noqa: BLE001
        return {"id": td["id"], "status": "error", "error": f"{type(e).__name__}: {e}",
                "source": td["source"], "model": td["model"], "target_lang": td["target_lang"]}


def _sync_run_manifest(job: dict) -> None:
    results = []
    for g in job["groups"]:
        for t in g["tasks"]:
            r = t.get("result") or {"id": t["id"], "status": g.get("remote_status") or g["status"],
                                    "source": t["source"], "model": t["model"], "target_lang": t["target_lang"]}
            if g["status"] == "submit_failed":
                r = {**r, "status": "error", "error": g.get("error")}
            results.append(r)
    core.write_manifest(Path(job["run_dir"]), {"kind": "batch", "batch_job": job["job_id"],
                                               "created_at": job["created_at"]}, results)


def cancel(job_id: str) -> dict:
    job = load(job_id)
    for g in job["groups"]:
        if not g.get("remote_id") or g["status"] == "fetched":
            continue
        if g["provider"] == "openai":
            httpx.post(f"{providers.OPENAI_BASE}/v1/batches/{g['remote_id']}/cancel", headers=_oa_headers(), timeout=60)
        else:
            httpx.post(f"{providers.GEMINI_BASE}/{g['remote_id']}:cancel", headers=_gm_headers(), timeout=60)
    return refresh(job_id, fetch=False)
