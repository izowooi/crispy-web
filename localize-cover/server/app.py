"""coverloc web app (FastAPI). Run: bin/coverloc serve  →  http://127.0.0.1:8787"""
from __future__ import annotations

import threading
import uuid
from datetime import datetime
from pathlib import Path
from statistics import mean, median

from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from coverloc import batch as batchmod
from coverloc import config, core, imaging, logs
from coverloc.providers import ProviderError

WEB = Path(__file__).resolve().parent.parent / "web"
app = FastAPI(title="coverloc")
config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
config.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Local files the UI may preview (only paths the user explicitly added).
_allowed: set[str] = set()


def _describe(path: str) -> dict:
    img = imaging.read_image(path)
    p = Path(path)
    _allowed.add(str(p.resolve()))
    return {"path": str(p.resolve()), "name": p.name, "w": img.shape[1], "h": img.shape[0],
            "bytes": p.stat().st_size}


@app.get("/api/config")
def get_config():
    return {
        "models": [{"id": k, **{x: v[x] for x in ("provider", "label", "note", "price", "alias")},
                    "sizes": v.get("sizes"), "thinking": v.get("thinking")} for k, v in config.MODELS.items()],
        "default_models": config.DEFAULT_MODELS,
        "languages": [{"code": k, **v} for k, v in config.LANGUAGES.items()],
        "keys": {"openai": bool(config.openai_key()), "gemini": bool(config.gemini_key())},
        "output_dir": str(config.OUTPUT_DIR),
    }


@app.post("/api/upload")
async def upload(files: list[UploadFile] = File(...)):
    out = []
    for f in files:
        d = config.UPLOAD_DIR / uuid.uuid4().hex[:8]
        d.mkdir(parents=True, exist_ok=True)
        dest = d / Path(f.filename or "image.png").name
        dest.write_bytes(await f.read())
        try:
            out.append(_describe(str(dest)))
        except ValueError as e:
            raise HTTPException(400, str(e))
    return out


class PathsIn(BaseModel):
    paths: list[str]


@app.post("/api/resolve")
def resolve(body: PathsIn):
    try:
        files = core.expand_inputs([p.strip() for p in body.paths if p.strip()])
    except FileNotFoundError as e:
        raise HTTPException(404, f"경로를 찾을 수 없습니다: {e}")
    if not files:
        raise HTTPException(404, "이미지 파일이 없습니다")
    return [_describe(f) for f in files]


@app.get("/api/local")
def local_file(path: str):
    rp = str(Path(path).resolve())
    if rp not in _allowed:
        raise HTTPException(403, "not an added input")
    return FileResponse(rp)


class RunIn(BaseModel):
    paths: list[str]
    targets: list[str]
    models: list[str]
    source_lang: str = "en"
    quality: str = "high"
    openai_mode: str = "responses"
    store: bool = False
    image_size: str = "auto"
    thinking: str | None = None
    extra: str = ""
    batch: bool = False
    cleanup_remote: bool = True
    label: str = ""
    concurrency: int = Field(4, ge=1, le=12)


@app.post("/api/runs")
def start_run(body: RunIn):
    try:
        opts = core.Options(source_lang=body.source_lang if body.source_lang == "auto" else config.norm_lang(body.source_lang),
                            quality=body.quality, openai_mode=body.openai_mode, store=body.store,
                            image_size=body.image_size, thinking=body.thinking or None, extra=body.extra)
        models = [config.resolve_model(m) for m in body.models]
        targets = [config.norm_lang(t) for t in body.targets]
        sources = core.expand_inputs(body.paths)
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(400, str(e))
    tasks = core.make_tasks(sources, targets, models, opts)
    if not tasks:
        raise HTTPException(400, "작업이 없습니다 (원본 언어와 대상 언어가 같은지 확인)")
    if body.batch:
        job = batchmod.submit(tasks, body.label, cleanup=body.cleanup_remote)
        return {"kind": "batch", "job_id": job["job_id"], "run_id": Path(job["run_dir"]).name, "tasks": len(tasks),
                "groups": [{k: g.get(k) for k in ("provider", "model", "remote_id", "status", "error")} for g in job["groups"]]}
    run_dir = core.new_run_dir(body.label)
    meta = {"options": opts.to_dict(), "models": models, "targets": targets, "label": body.label,
            "created_at": datetime.now().isoformat(timespec="seconds")}
    # write the initial manifest before the worker starts so the UI can poll immediately
    core.write_manifest(run_dir, {"kind": "sync", **meta},
                        [{"id": t.id, "status": "running", "source": t.source, "model": t.model,
                          "target_lang": t.target_lang} for t in tasks])
    threading.Thread(target=core.run_sync, args=(tasks, run_dir),
                     kwargs={"concurrency": body.concurrency, "meta": meta}, daemon=True).start()
    return {"kind": "sync", "run_id": run_dir.name, "tasks": len(tasks)}


@app.get("/api/runs")
def runs():
    return [{"run_id": r["run_id"], "kind": r.get("kind"), "created_at": r.get("created_at"),
             "label": r.get("label"), "batch_job": r.get("batch_job"), "summary": r.get("summary"),
             "targets": sorted({x.get("target_lang") for x in r.get("results", []) if x.get("target_lang")}),
             "models": sorted({x.get("model") for x in r.get("results", []) if x.get("model")})}
            for r in core.list_runs()]


@app.get("/api/runs/{run_id}")
def run_detail(run_id: str):
    for r in core.list_runs():
        if r["run_id"] == run_id:
            return r
    raise HTTPException(404, "run not found")


@app.get("/api/batches")
def batches():
    return batchmod.list_jobs()


@app.post("/api/batches/{job_id}/refresh")
def batch_refresh(job_id: str):
    try:
        return batchmod.refresh(job_id)
    except FileNotFoundError:
        raise HTTPException(404, "job not found")


@app.post("/api/batches/{job_id}/cancel")
def batch_cancel(job_id: str):
    return batchmod.cancel(job_id)


@app.get("/api/stats")
def stats():
    by: dict[str, list[dict]] = {}
    for r in core.list_runs():
        for x in r.get("results", []):
            if x.get("status") == "done":
                by.setdefault(x["model"], []).append(x)
    rows = []
    for m, xs in by.items():
        drifts = [x["alignment"]["drift_px_max"] for x in xs if x["alignment"].get("drift_px_max") is not None]
        sync = [x for x in xs if not x.get("batch")]
        bat = [x for x in xs if x.get("batch")]
        rows.append({
            "model": m, "label": config.MODELS.get(m, {}).get("label", m), "n": len(xs),
            "exact_size_rate": round(100 * mean(1.0 if x["size"]["exact_match"] else 0.0 for x in xs), 1),
            "model_honored_size_rate": round(100 * mean(1.0 if x["geometry"]["model_honored_size"] else 0.0 for x in xs), 1),
            "drift_median_px": round(median(drifts), 2) if drifts else None,
            "drift_max_px": round(max(drifts), 2) if drifts else None,
            "psnr_unchanged_median_db": round(median(x["fidelity"]["psnr_unchanged_db"] for x in xs), 2),
            "cost_avg_usd": round(mean(x["cost"]["usd"] for x in sync), 5) if sync else None,
            "cost_avg_batch_usd": round(mean(x["cost"]["usd"] for x in bat), 5) if bat else None,
            "time_avg_s": round(mean(t), 1) if (t := [x["elapsed_s"] for x in sync if x.get("elapsed_s")]) else None,
        })
    return sorted(rows, key=lambda r: r["model"])


# ------------------------------------------------------------------ provider log management
# The OpenAI session key (sess-…) is only ever passed through per request in
# headers from the browser's memory; it is never written to disk or logged.

def _session(key: str | None, org: str | None, project: str | None) -> dict | None:
    return {"key": key.strip(), "org": (org or "").strip(), "project": (project or "").strip()} if key else None


def _call(fn, *a, **kw):
    try:
        return fn(*a, **kw)
    except ProviderError as e:
        raise HTTPException(400, str(e))


@app.get("/api/logs/openai/responses")
def logs_list_responses(after: str | None = None, limit: int = 50,
                        x_oai_session: str | None = Header(None), x_oai_org: str | None = Header(None),
                        x_oai_project: str | None = Header(None)):
    s = _session(x_oai_session, x_oai_org, x_oai_project)
    if not s:
        raise HTTPException(400, "세션 키(sess-…)가 필요합니다. API 키로는 로그 목록을 조회할 수 없습니다.")
    return _call(logs.list_responses, s, limit, after)


class IdsIn(BaseModel):
    ids: list[str]


@app.post("/api/logs/openai/responses/delete")
def logs_delete_responses(body: IdsIn, x_oai_session: str | None = Header(None),
                          x_oai_org: str | None = Header(None), x_oai_project: str | None = Header(None)):
    s = _session(x_oai_session, x_oai_org, x_oai_project)
    results = []
    for rid in dict.fromkeys(i.strip() for i in body.ids if i.strip()):
        r = logs.delete_response(rid, s)
        if r.get("deleted"):
            logs.mark_local_deleted(rid)
        results.append(r)
    return {"results": results, "deleted": sum(r["deleted"] for r in results)}


@app.get("/api/logs/openai/local")
def logs_local():
    return logs.local_stored_responses()


@app.get("/api/logs/openai/batches")
def logs_openai_batches():
    return _call(logs.list_openai_batches)


@app.post("/api/logs/openai/batches/{batch_id}/purge")
def logs_openai_batch_purge(batch_id: str):
    return _call(logs.purge_openai_batch, batch_id)


@app.post("/api/logs/openai/files/delete")
def logs_openai_files_delete(body: IdsIn):
    return {"results": [logs.delete_openai_file(i) for i in body.ids]}


@app.get("/api/logs/gemini")
def logs_gemini():
    return {"batches": _call(logs.list_gemini_batches), "files": _call(logs.list_gemini_files)}


class NamesIn(BaseModel):
    names: list[str]


@app.post("/api/logs/gemini/delete")
def logs_gemini_delete(body: NamesIn):
    out = []
    for n in body.names:
        out.append(logs.purge_gemini_batch(n) if n.startswith("batches/") else logs.delete_gemini(n))
    return {"results": out}



@app.post("/api/logs/batches/purge")
def logs_purge_batches(body: IdsIn):
    return {"results": [logs.purge_batch(i) for i in dict.fromkeys(x.strip() for x in body.ids if x.strip())]}

app.mount("/files", StaticFiles(directory=str(config.OUTPUT_DIR)), name="files")
app.mount("/", StaticFiles(directory=str(WEB), html=True), name="web")
