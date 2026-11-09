"""Provider-side log / artifact cleanup.

What exists on the provider side after using this app, and how to remove it:

OpenAI
  * Responses API with store=true  -> a stored Response object = the entries on
    the dashboard "Logs" page.  Delete: DELETE /v1/responses/{id}.
    Listing them (GET /v1/responses) only works with a browser *session* key
    (sess-…) — API keys are rejected ("must be made with a session key").
  * Images API calls create no stored object (nothing on the Logs page).
  * Batches: the batch record itself cannot be deleted (DELETE /v1/batches/{id}
    -> "Invalid method"). Its input/output/error JSONL files — which contain the
    images and prompts — can be: DELETE /v1/files/{id}.
Gemini
  * Batch jobs: DELETE /v1beta/batches/{id}.  Uploaded files: DELETE /v1beta/files/{id}
    (they also expire on their own — observed
    expirationTime ≈ 30 days for batch input files, so do not rely on it).
  * AI Studio "Logs and datasets" entries are managed in AI Studio itself; this
    app sends store=false by default so none are created.
"""
from __future__ import annotations

import json
from datetime import datetime

import httpx

from . import config
from .providers import GEMINI_BASE, OPENAI_BASE, ProviderError, _err

# ------------------------------------------------------------------ helpers


def _oa_headers(session: dict | None = None) -> dict:
    if session and session.get("key"):
        h = {"Authorization": f"Bearer {session['key']}", "OpenAI-Beta": "responses=v1"}
        if session.get("org"):
            h["OpenAI-Organization"] = session["org"]
        if session.get("project"):
            h["OpenAI-Project"] = session["project"]
        return h
    key = config.openai_key()
    if not key:
        raise ProviderError("OPENAI_API_KEY missing")
    return {"Authorization": f"Bearer {key}"}


def _gm_headers() -> dict:
    key = config.gemini_key()
    if not key:
        raise ProviderError("GEMINI_API_KEY missing")
    return {"x-goog-api-key": key}


def _json(r: httpx.Response) -> dict:
    try:
        j = r.json()
    except ValueError:
        raise ProviderError(f"HTTP {r.status_code}: {r.text[:200]}")
    if r.status_code >= 400:
        raise ProviderError(f"HTTP {r.status_code}: {_err(j.get('error', j))}")
    return j


def _ts(sec) -> str | None:
    return datetime.fromtimestamp(sec).isoformat(timespec="seconds") if sec else None


# ------------------------------------------------------------------ OpenAI Responses logs


def _preview(resp: dict) -> str:
    for item in resp.get("input") or []:
        content = item.get("content")
        if isinstance(content, str):
            return content[:140]
        for c in content or []:
            if c.get("type") == "input_text":
                return c.get("text", "")[:140]
    return ""


def list_responses(session: dict, limit: int = 50, after: str | None = None) -> dict:
    """Same request the dashboard Logs page makes (needs a session key)."""
    params: list[tuple[str, str]] = [("limit", str(limit)), ("order", "desc"),
                                     ("input_item_limit", "1"), ("output_item_limit", "1")]
    if after:
        params.append(("after", after))
    r = httpx.get(OPENAI_BASE + "/v1/responses", params=params, headers=_oa_headers(session), timeout=60)
    j = _json(r)
    items = []
    for d in j.get("data", []):
        items.append({
            "id": d["id"], "created_at": _ts(d.get("created_at")), "model": d.get("model"),
            "status": d.get("status"), "store": d.get("store"),
            "tools": [t.get("model") or t.get("type") for t in d.get("tools") or []],
            "output_types": [o.get("type") for o in d.get("output") or []],
            "preview": _preview(d),
        })
    return {"items": items, "has_more": j.get("has_more"), "last_id": j.get("last_id"), "total": j.get("total")}


def delete_response(resp_id: str, session: dict | None = None) -> dict:
    resp_id = resp_id.strip()
    if not resp_id.startswith("resp_"):
        return {"id": resp_id, "deleted": False, "error": "not a response id (resp_…)"}
    attempts = [session, None] if session and session.get("key") else [None]
    last = ""
    for s in attempts:  # session key first (same project as the list), then API key
        try:
            r = httpx.delete(f"{OPENAI_BASE}/v1/responses/{resp_id}", headers=_oa_headers(s), timeout=60)
            j = _json(r)
            return {"id": resp_id, "deleted": bool(j.get("deleted")), "via": "session" if s else "api_key"}
        except ProviderError as e:
            last = str(e)
    return {"id": resp_id, "deleted": False, "error": last}


def local_stored_responses() -> list[dict]:
    """Responses this app itself created with store=true (tracked in result JSON)."""
    out = []
    if not config.OUTPUT_DIR.exists():
        return out
    for f in config.OUTPUT_DIR.glob("*/*/*.json"):
        try:
            r = json.loads(f.read_text(encoding="utf-8"))
        except (ValueError, OSError):
            continue
        rid = (r.get("extra") or {}).get("response_id")
        if rid and (r.get("options") or {}).get("store"):
            out.append({"id": rid, "created_at": r.get("finished_at"), "model": r.get("model"),
                        "target_lang": r.get("target_lang"), "source": r.get("source"),
                        "batch": r.get("batch"), "deleted": (r.get("extra") or {}).get("response_deleted", False),
                        "result_json": str(f)})
    return sorted(out, key=lambda x: x["created_at"] or "", reverse=True)


def mark_local_deleted(resp_id: str) -> None:
    for x in local_stored_responses():
        if x["id"] == resp_id:
            p = x["result_json"]
            with open(p, encoding="utf-8") as fh:
                r = json.load(fh)
            r["extra"]["response_deleted"] = True
            with open(p, "w", encoding="utf-8") as fh:
                json.dump(r, fh, ensure_ascii=False, indent=2)


# ------------------------------------------------------------------ OpenAI batches & files


def _existing_openai_files() -> dict[str, dict]:
    files, after = {}, None
    for _ in range(20):
        params = {"limit": 10000}
        if after:
            params["after"] = after
        j = _json(httpx.get(OPENAI_BASE + "/v1/files", params=params, headers=_oa_headers(), timeout=60))
        for f in j.get("data", []):
            files[f["id"]] = f
        if not j.get("has_more"):
            break
        after = j.get("last_id") or (j["data"][-1]["id"] if j.get("data") else None)
    return files


def list_openai_batches(limit: int = 50) -> list[dict]:
    j = _json(httpx.get(OPENAI_BASE + "/v1/batches", params={"limit": limit}, headers=_oa_headers(), timeout=60))
    existing = _existing_openai_files()
    out = []
    for b in j.get("data", []):
        files = []
        for kind in ("input_file_id", "output_file_id", "error_file_id"):
            fid = b.get(kind)
            if fid:
                f = existing.get(fid)
                files.append({"kind": kind.replace("_file_id", ""), "id": fid, "exists": f is not None,
                              "bytes": f.get("bytes") if f else None, "filename": f.get("filename") if f else None})
        out.append({"id": b["id"], "endpoint": b.get("endpoint"), "status": b.get("status"),
                    "created_at": _ts(b.get("created_at")), "counts": b.get("request_counts"),
                    "app": (b.get("metadata") or {}).get("app"), "files": files})
    return out


def delete_openai_file(file_id: str) -> dict:
    try:
        j = _json(httpx.delete(f"{OPENAI_BASE}/v1/files/{file_id}", headers=_oa_headers(), timeout=60))
        return {"id": file_id, "deleted": bool(j.get("deleted"))}
    except ProviderError as e:
        if "404" in str(e) or "No such File" in str(e):
            return {"id": file_id, "deleted": True, "note": "already gone"}
        return {"id": file_id, "deleted": False, "error": str(e)}


def purge_openai_batch(batch_id: str) -> dict:
    b = _json(httpx.get(f"{OPENAI_BASE}/v1/batches/{batch_id}", headers=_oa_headers(), timeout=60))
    if b.get("status") not in ("completed", "failed", "expired", "cancelled"):
        raise ProviderError(f"batch is {b.get('status')}; delete files after it finishes")
    res = [delete_openai_file(b[k]) for k in ("input_file_id", "output_file_id", "error_file_id") if b.get(k)]
    return {"batch": batch_id, "files": res,
            "note": "The batch record itself cannot be deleted via the API (metadata only remains)."}


# ------------------------------------------------------------------ Gemini


def list_gemini_batches() -> list[dict]:
    j = _json(httpx.get(f"{GEMINI_BASE}/batches", params={"pageSize": 100}, headers=_gm_headers(), timeout=60))
    out = []
    for b in j.get("operations", j.get("batches", [])):
        m = b.get("metadata") or {}
        out.append({"name": b["name"], "display_name": m.get("displayName"), "model": m.get("model"),
                    "state": m.get("state"), "created_at": m.get("createTime"), "stats": m.get("batchStats"),
                    "input_file": ((m.get("inputConfig") or {}).get("fileName")),
                    "output_file": (((b.get("response") or m.get("output") or {}).get("responsesFile")))})
    return out


def list_gemini_files() -> list[dict]:
    j = _json(httpx.get(f"{GEMINI_BASE}/files", params={"pageSize": 100}, headers=_gm_headers(), timeout=60))
    return [{"name": f["name"], "display_name": f.get("displayName"), "bytes": f.get("sizeBytes"),
             "mime": f.get("mimeType"), "created_at": f.get("createTime"), "expires_at": f.get("expirationTime"),
             "source": f.get("source")} for f in j.get("files", [])]


def delete_gemini(name: str) -> dict:
    if not (name.startswith("batches/") or name.startswith("files/")):
        return {"name": name, "deleted": False, "error": "expected batches/… or files/…"}
    try:
        _json(httpx.delete(f"{GEMINI_BASE}/{name}", headers=_gm_headers(), timeout=60))
        return {"name": name, "deleted": True}
    except ProviderError as e:
        if "404" in str(e) or "NOT_FOUND" in str(e):
            return {"name": name, "deleted": True, "note": "already gone"}
        return {"name": name, "deleted": False, "error": str(e)}


def purge_gemini_batch(name: str) -> dict:
    b = next((x for x in list_gemini_batches() if x["name"] == name), None)
    res = []
    if b and b.get("input_file"):
        res.append(delete_gemini(b["input_file"]))
    # The output file (files/batch-…) is system-owned: the Files API refuses to
    # delete it ("File ID cannot be more than 40 characters"); it goes with the batch.
    res.append(delete_gemini(name))
    return {"batch": name, "results": res}


def purge_batch(batch_id: str) -> dict:
    """Delete everything deletable for one batch ID.
    OpenAI  batch_…   -> input/output/error files (record itself is not deletable)
    Gemini  batches/… -> input file + the batch job (its output file goes with it)"""
    bid = batch_id.strip()
    try:
        if bid.startswith("batch_"):
            r = purge_openai_batch(bid)
            ok = all(f.get("deleted") for f in r["files"])
            return {"id": bid, "provider": "openai", "ok": ok, "deleted_files": sum(f.get("deleted", False) for f in r["files"]),
                    "details": r["files"], "note": "배치 기록(메타데이터)은 API로 삭제할 수 없어 남습니다."}
        if bid.startswith("batches/") or (bid and "/" not in bid and not bid.startswith("batch_")):
            name = bid if bid.startswith("batches/") else f"batches/{bid}"
            r = purge_gemini_batch(name)
            return {"id": name, "provider": "gemini", "ok": all(x.get("deleted") for x in r["results"]),
                    "details": r["results"]}
        return {"id": bid, "ok": False, "error": "batch_… (OpenAI) 또는 batches/… (Gemini) 형식이어야 합니다"}
    except ProviderError as e:
        return {"id": bid, "ok": False, "error": str(e)}
