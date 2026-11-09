"""Shared pipeline used by the CLI, the web app and batch jobs."""
from __future__ import annotations

import json
import re
import shutil
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path

from . import config, imaging, providers
from .prompts import build_prompt

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"}


@dataclass
class Options:
    source_lang: str = "en"
    quality: str = "high"            # OpenAI: low|medium|high|xhigh|max|auto
    openai_mode: str = "responses"   # responses (store-able) | images
    store: bool = False              # provider-side logging; OFF by default
    image_size: str = "auto"         # Gemini: auto|1K|2K|4K
    thinking: str | None = None      # Gemini thinking level (model default if None)
    text_model: str = config.DEFAULT_TEXT_MODEL
    extra: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class Task:
    source: str
    target_lang: str
    model: str
    opts: Options
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:10])


# ------------------------------------------------------------------ helpers

def expand_inputs(paths: list[str]) -> list[str]:
    out: list[str] = []
    for p in paths:
        pp = Path(p).expanduser()
        if pp.is_dir():
            out += sorted(str(f) for f in pp.iterdir() if f.suffix.lower() in IMAGE_EXTS)
        elif pp.is_file():
            out.append(str(pp))
        else:
            raise FileNotFoundError(p)
    return out


def slug(s: str) -> str:
    s = re.sub(r"[^\w.-]+", "_", Path(s).stem, flags=re.UNICODE).strip("_")
    return s[:60] or "image"


def new_run_dir(label: str = "") -> Path:
    rid = datetime.now().strftime("%Y%m%d-%H%M%S") + "-" + uuid.uuid4().hex[:4]
    d = config.OUTPUT_DIR / (rid + (f"-{label}" if label else ""))
    d.mkdir(parents=True, exist_ok=True)
    return d


def plan_for(task: Task, w: int, h: int) -> imaging.Plan:
    m = config.MODELS[task.model]
    if m["provider"] == "openai":
        return imaging.plan_openai(w, h)
    return imaging.plan_gemini(w, h, task.opts.image_size, tuple(m.get("sizes", ["1K", "2K", "4K"])))


def build_request(task: Task) -> tuple[str, str, dict, imaging.Plan, str]:
    """-> provider, path, body, plan, prompt"""
    src = imaging.read_image(task.source)
    h, w = src.shape[:2]
    plan = plan_for(task, w, h)
    b64 = imaging.to_b64_png(imaging.model_input(src, plan))
    prompt = build_prompt(task.opts.source_lang, task.target_lang, task.opts.extra)
    provider = config.MODELS[task.model]["provider"]
    if provider == "openai":
        path, body = providers.openai_request(task.model, prompt, b64, plan.request_w, plan.request_h,
                                              quality=task.opts.quality, mode=task.opts.openai_mode,
                                              store=task.opts.store, text_model=task.opts.text_model)
    else:
        path, body = providers.gemini_request(task.model, prompt, b64, aspect=plan.aspect,
                                              image_size=plan.image_size, store=task.opts.store,
                                              thinking=task.opts.thinking)
    return provider, path, body, plan, prompt


def parse_response(task: Task, j: dict):
    if config.MODELS[task.model]["provider"] == "openai":
        return providers.openai_parse(task.opts.openai_mode, j)
    return providers.gemini_parse(j)


def finalize(task: Task, plan: imaging.Plan, img_bytes: bytes, usage: dict, extra: dict,
             run_dir: Path, *, batch: bool, elapsed: float | None, prompt: str) -> dict:
    """Restore exact size, measure, save files, compute cost. No correction."""
    src = imaging.read_image(task.source)
    raw = imaging.decode_image(img_bytes)
    final, geo = imaging.restore(raw, plan)
    align = imaging.measure_alignment(src, final)
    fid = imaging.fidelity_report(src, final)
    heat = imaging.diff_heatmap(src, final, imaging.changed_mask(src, final))

    item_dir = run_dir / slug(task.source)
    item_dir.mkdir(parents=True, exist_ok=True)
    src_copy = item_dir / ("source" + Path(task.source).suffix.lower())
    if not src_copy.exists():
        shutil.copyfile(task.source, src_copy)
    base = f"{task.target_lang}__{task.model}"
    prev = item_dir / f"{base}.json"
    if prev.exists():  # same lang+model already in this run: overwrite only if it is the same task
        try:
            same = json.loads(prev.read_text(encoding="utf-8")).get("id") == task.id
        except ValueError:
            same = False
        if not same:
            base += "__" + task.id[:4]
    imaging.write_image(str(item_dir / f"{base}.png"), final)
    imaging.write_image(str(item_dir / f"{base}.model-raw.png"), raw)
    imaging.write_image(str(item_dir / f"{base}.diff.jpg"), heat, 85)

    c = providers.cost(usage, task.model, task.opts.text_model, batch)
    rec = {
        "id": task.id, "status": "done",
        "source": task.source, "source_file": str(src_copy.relative_to(config.OUTPUT_DIR)),
        "output_file": str((item_dir / f"{base}.png").relative_to(config.OUTPUT_DIR)),
        "raw_file": str((item_dir / f"{base}.model-raw.png").relative_to(config.OUTPUT_DIR)),
        "diff_file": str((item_dir / f"{base}.diff.jpg").relative_to(config.OUTPUT_DIR)),
        "model": task.model, "model_label": config.MODELS[task.model]["label"],
        "source_lang": task.opts.source_lang, "target_lang": task.target_lang,
        "options": task.opts.to_dict(), "batch": batch,
        "size": {"source_w": plan.orig_w, "source_h": plan.orig_h,
                 "final_w": final.shape[1], "final_h": final.shape[0],
                 "exact_match": (final.shape[1], final.shape[0]) == (plan.orig_w, plan.orig_h)},
        "plan": plan.to_dict(), "geometry": geo, "alignment": align, "fidelity": fid,
        "usage": usage, "cost": c, "elapsed_s": round(elapsed, 1) if elapsed else None,
        "prompt": prompt, "extra": extra,
        "finished_at": datetime.now().isoformat(timespec="seconds"),
    }
    with open(item_dir / f"{base}.json", "w", encoding="utf-8") as f:
        json.dump(rec, f, ensure_ascii=False, indent=2)
    return rec


def run_task(task: Task, run_dir: Path) -> dict:
    t0 = time.time()
    try:
        provider, path, body, plan, prompt = build_request(task)
        j = providers.post(provider, path, body)
        img, usage, extra = parse_response(task, j)
        return finalize(task, plan, img, usage, extra, run_dir, batch=False,
                        elapsed=time.time() - t0, prompt=prompt)
    except Exception as e:  # noqa: BLE001 — report per-task failures, keep going
        return {"id": task.id, "status": "error", "error": f"{type(e).__name__}: {e}",
                "source": task.source, "model": task.model, "target_lang": task.target_lang,
                "elapsed_s": round(time.time() - t0, 1)}


# ------------------------------------------------------------------ runs

_run_lock = threading.Lock()


def write_manifest(run_dir: Path, meta: dict, results: list[dict]) -> None:
    with _run_lock:
        done = [r for r in results if r.get("status") == "done"]
        meta = {**meta, "results": results,
                "summary": {"tasks": len(results), "done": len(done),
                            "errors": sum(r.get("status") == "error" for r in results),
                            "total_usd": round(sum(r["cost"]["usd"] for r in done), 6)}}
        tmp = run_dir / "run.json.tmp"
        tmp.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp.replace(run_dir / "run.json")


def make_tasks(sources: list[str], targets: list[str], models: list[str], opts: Options) -> list[Task]:
    tasks = []
    for s in sources:
        for t in targets:
            if t == opts.source_lang:
                continue
            for m in models:
                tasks.append(Task(s, t, m, opts))
    return tasks


def run_sync(tasks: list[Task], run_dir: Path, *, concurrency: int = 4, meta: dict | None = None,
             on_update=None) -> list[dict]:
    meta = {"kind": "sync", **(meta or {})}
    meta.setdefault("created_at", datetime.now().isoformat(timespec="seconds"))
    results: list[dict] = [{"id": t.id, "status": "running", "source": t.source, "model": t.model,
                            "target_lang": t.target_lang} for t in tasks]
    write_manifest(run_dir, meta, results)

    def work(i: int, t: Task):
        r = run_task(t, run_dir)
        results[i] = r
        write_manifest(run_dir, meta, results)
        if on_update:
            on_update(r)

    with ThreadPoolExecutor(max_workers=max(1, concurrency)) as ex:
        for f in [ex.submit(work, i, t) for i, t in enumerate(tasks)]:
            f.result()
    return results


def list_runs() -> list[dict]:
    runs = []
    if not config.OUTPUT_DIR.exists():
        return runs
    for d in sorted(config.OUTPUT_DIR.iterdir(), reverse=True):
        mf = d / "run.json"
        if d.is_dir() and mf.exists():
            try:
                m = json.loads(mf.read_text(encoding="utf-8"))
                m["run_id"] = d.name
                runs.append(m)
            except (ValueError, OSError):
                continue
    return runs
