"""coverloc CLI.

Examples
  bin/coverloc run docs/cover.png --to ja                       # single image, default models
  bin/coverloc run docs/ --to ja zh-Hans --model sunburst nb21  # folder, 2 langs x 2 models
  bin/coverloc run docs/ --to ja --batch                        # 50% price, async (<=24h)
  bin/coverloc batch list | status <job> | cancel <job>
  bin/coverloc serve                                            # web app on :8787
"""
from __future__ import annotations

import argparse
import json
import sys
import time

from . import batch as batchmod
from . import config, core


def _c(code: str, s: str) -> str:
    return f"\033[{code}m{s}\033[0m" if sys.stdout.isatty() else s


def _row(r: dict) -> str:
    if r.get("status") != "done":
        return f"  {_c('31', '✗')} {r.get('target_lang', '?'):8} {r.get('model', '?'):26} {r.get('error', r.get('status'))}"
    s, a, f = r["size"], r["alignment"], r["fidelity"]
    size = f"{s['final_w']}x{s['final_h']}" + (_c("32", " ✓") if s["exact_match"] else _c("31", " ✗"))
    raw = f"{r['geometry']['model_output_w']}x{r['geometry']['model_output_h']}"
    drift = "n/a" if a.get("drift_px_max") is None else f"{a['drift_px_max']:.2f}px"
    t = f"{r['elapsed_s']}s" if r.get("elapsed_s") else "batch"
    return (f"  {_c('32', '✓')} {r['target_lang']:8} {r['model']:26} out {size:12} model-raw {raw:10} "
            f"drift {drift:8} changed {f['changed_area_pct']:5.1f}%  ${r['cost']['usd']:.4f}  {t}"
            f"\n      → {config.OUTPUT_DIR / r['output_file']}")


def cmd_run(a) -> int:
    sources = core.expand_inputs(a.inputs)
    if not sources:
        print("no images found", file=sys.stderr)
        return 1
    opts = core.Options(source_lang=config.norm_lang(a.source) if a.source != "auto" else "auto",
                        quality=a.quality, openai_mode=a.openai_mode, store=a.store,
                        image_size=a.image_size, thinking=a.thinking, extra=a.extra or "")
    models = [config.resolve_model(m) for m in a.model]
    targets = [config.norm_lang(t) for t in a.to]
    tasks = core.make_tasks(sources, targets, models, opts)
    print(f"{len(sources)} image(s) × {len(targets)} lang(s) × {len(models)} model(s) = {len(tasks)} task(s)  "
          f"| store={'ON' if a.store else 'off'} | openai-mode={a.openai_mode} | {'BATCH' if a.batch else 'sync'}")
    if a.batch:
        job = batchmod.submit(tasks, a.label or "", cleanup=not a.keep_remote_files)
        for g in job["groups"]:
            print(f"  {g['provider']:6} {g['model']:26} {len(g['tasks'])} req → {g['remote_id'] or g['error']}")
        print(f"batch job: {job['job_id']}\n  check:  bin/coverloc batch status {job['job_id']}"
              + ("\n  (waiting…)" if a.wait else ""))
        if a.wait:
            return _wait(job["job_id"], a.poll)
        return 0
    run_dir = core.new_run_dir(a.label or "")
    print(f"run dir: {run_dir}")
    res = core.run_sync(tasks, run_dir, concurrency=a.concurrency,
                        meta={"options": opts.to_dict(), "models": models, "targets": targets},
                        on_update=lambda r: print(_row(r), flush=True))
    done = [r for r in res if r["status"] == "done"]
    print(f"\n{len(done)}/{len(res)} ok · total ${sum(r['cost']['usd'] for r in done):.4f} · manifest {run_dir/'run.json'}")
    return 0 if len(done) == len(res) else 2


def _wait(job_id: str, poll: int) -> int:
    while True:
        job = batchmod.refresh(job_id)
        print(time.strftime("%H:%M:%S"), job["status"],
              ", ".join(f"{g['model']}={g.get('remote_status')} {g.get('counts') or ''}" for g in job["groups"]),
              flush=True)
        if job["status"] in ("done", "failed"):
            _print_job(job)
            return 0
        time.sleep(poll)


def _print_job(job: dict) -> None:
    print(f"job {job['job_id']}  status={job['status']}  run_dir={job['run_dir']}")
    total = 0.0
    for g in job["groups"]:
        print(f" [{g['provider']}] {g['model']}  remote={g.get('remote_id')}  {g.get('remote_status') or g['status']}"
              f"  {g.get('counts') or ''} {g.get('error') or g.get('poll_error') or ''}")
        for t in g["tasks"]:
            if t.get("result"):
                print(_row(t["result"]))
                if t["result"].get("status") == "done":
                    total += t["result"]["cost"]["usd"]
    if total:
        print(f" total (batch pricing) ${total:.4f}")


def cmd_batch(a) -> int:
    if a.action == "list":
        for j in batchmod.list_jobs():
            n = sum(len(g["tasks"]) for g in j["groups"])
            print(f"{j['job_id']}  {j['status']:12} {n:3} task(s)  "
                  + ", ".join(f"{g['model']}:{g.get('remote_status') or g['status']}" for g in j["groups"]))
        return 0
    if not a.job:
        print("job id required", file=sys.stderr)
        return 1
    if a.action == "cancel":
        _print_job(batchmod.cancel(a.job))
    elif a.action == "wait":
        return _wait(a.job, a.poll)
    else:
        _print_job(batchmod.refresh(a.job))
    return 0


def cmd_models(_a) -> int:
    for mid, m in config.MODELS.items():
        p = m["price"]
        print(f"{mid:26} {m['provider']:6} aliases={','.join(m['alias']):22} "
              f"in ${p['image_in']}/M img-out ${p['image_out']}/M  batch -{int(m['batch_discount']*100)}%  {m['note']}")
    print("languages:", ", ".join(f"{k} ({v['native']})" for k, v in config.LANGUAGES.items()))
    return 0


def cmd_runs(_a) -> int:
    for r in core.list_runs()[:30]:
        s = r.get("summary", {})
        print(f"{r['run_id']:40} {r.get('kind', ''):6} {s.get('done', 0)}/{s.get('tasks', 0)}  ${s.get('total_usd', 0):.4f}")
    return 0


def cmd_logs(a) -> int:
    from . import logs
    if a.action == "delete":
        for rid in a.ids:
            r = logs.delete_response(rid)
            if r.get("deleted"):
                logs.mark_local_deleted(rid)
            print(("✓ deleted " if r.get("deleted") else "✗ ") + rid + ("" if r.get("deleted") else f"  {r.get('error')}"))
    elif a.action == "purge":
        for bid in a.ids:
            r = logs.purge_batch(bid)
            print(("✓ " if r.get("ok") else "✗ ") + r["id"] + "  " + (r.get("error") or json.dumps(r.get("details"), ensure_ascii=False))
                  + (f"  ({r['note']})" if r.get("note") else ""))
    elif a.action == "local":
        for x in logs.local_stored_responses():
            print(f"{x['id']}  {x['created_at']}  {x['model']}  {x['target_lang']}  {'deleted' if x['deleted'] else 'STORED'}")
    elif a.action == "batches":
        for b in logs.list_openai_batches():
            live = [f for f in b["files"] if f["exists"]]
            print(f"{b['id']}  {b['status']:10} {b['created_at']}  files left: {len(live)}")
            if a.purge and live:
                r = logs.purge_openai_batch(b["id"])
                print("   purged:", ", ".join(f"{f['id']}={'ok' if f['deleted'] else f.get('error')}" for f in r["files"]))
        for g in logs.list_gemini_batches():
            print(f"{g['name']}  {g['state']}")
            if a.purge:
                print("   purged:", logs.purge_gemini_batch(g["name"])["results"])
    return 0


def cmd_serve(a) -> int:
    import uvicorn
    print(f"→ http://{a.host}:{a.port}")
    uvicorn.run("server.app:app", host=a.host, port=a.port, log_level="warning")
    return 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="coverloc", description="Localize cover images with AI image models; output size always equals input size.")
    sub = ap.add_subparsers(dest="cmd", required=True)

    r = sub.add_parser("run", help="localize image file(s) or folder(s)")
    r.add_argument("inputs", nargs="+", help="image paths and/or folders")
    r.add_argument("--to", nargs="+", required=True, help="target languages: ja zh-Hans zh-Hant ko en")
    r.add_argument("--from", dest="source", default="en", help="source language (default en; 'auto' allowed)")
    r.add_argument("--model", nargs="+", default=config.DEFAULT_MODELS,
                   help="sunburst flare nb21 nbpro nb2 (default: sunburst flare nb21)")
    r.add_argument("--quality", default="high", choices=["low", "medium", "high", "xhigh", "max", "auto"],
                   help="OpenAI quality (default high)")
    r.add_argument("--openai-mode", default="responses", choices=["responses", "images"],
                   help="responses = Responses API image tool (store-able, default); images = Images API (no store param)")
    st = r.add_mutually_exclusive_group()
    st.add_argument("--store", dest="store", action="store_true", help="enable provider-side logging (dashboard)")
    st.add_argument("--no-store", dest="store", action="store_false", help="disable logging (DEFAULT)")
    r.set_defaults(store=False)
    r.add_argument("--image-size", default="auto", choices=["auto", "1K", "2K", "4K"], help="Gemini output tier")
    r.add_argument("--thinking", default=None, help="Gemini thinking level (minimal|medium|high)")
    r.add_argument("--extra", default="", help="extra instructions appended to the prompt (e.g. glossary)")
    r.add_argument("--batch", action="store_true", help="submit as async batch (50%% price)")
    r.add_argument("--wait", action="store_true", help="with --batch: poll until finished")
    r.add_argument("--keep-remote-files", action="store_true",
                   help="with --batch: keep provider-side batch input/output files (default: delete after download)")
    r.add_argument("--poll", type=int, default=30)
    r.add_argument("--concurrency", type=int, default=4)
    r.add_argument("--label", default="")
    r.set_defaults(fn=cmd_run)

    b = sub.add_parser("batch", help="manage batch jobs")
    b.add_argument("action", choices=["list", "status", "wait", "cancel"])
    b.add_argument("job", nargs="?")
    b.add_argument("--poll", type=int, default=30)
    b.set_defaults(fn=cmd_batch)

    lg = sub.add_parser("logs", help="provider-side logs: delete stored responses / batch files")
    lg.add_argument("action", choices=["local", "delete", "batches", "purge"],
                    help="local = store:true responses made by this app; delete <resp_id…>; purge <batch_id…>; batches [--purge]")
    lg.add_argument("ids", nargs="*")
    lg.add_argument("--purge", action="store_true", help="with batches: delete remote batch files / Gemini batches")
    lg.set_defaults(fn=cmd_logs)

    sub.add_parser("models", help="list models, prices, languages").set_defaults(fn=cmd_models)
    sub.add_parser("runs", help="list previous runs").set_defaults(fn=cmd_runs)
    s = sub.add_parser("serve", help="start the web app")
    s.add_argument("--host", default="127.0.0.1")
    s.add_argument("--port", type=int, default=8787)
    s.set_defaults(fn=cmd_serve)

    a = ap.parse_args(argv)
    try:
        return a.fn(a)
    except (ValueError, FileNotFoundError) as e:
        print(f"error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
