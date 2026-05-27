#!/usr/bin/env python3
"""Upload parsed Coupang payload batches to Supabase.

Default mode calls public.cp_import_payload(jsonb) directly with a Supabase
secret/service-role key. If CP_INGEST_TOKEN is provided, the script instead
uses the older temporary-token RPC path, which is useful for one-off imports.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Iterable


PARSER_VERSION = "cp-mail-importer-v1"


def chunked(values: list[dict[str, Any]], size: int) -> Iterable[list[dict[str, Any]]]:
    for idx in range(0, len(values), size):
        yield values[idx : idx + size]


def post_rpc(
    supabase_url: str,
    supabase_key: str,
    payload: dict[str, Any],
    timeout: int,
    ingest_token: str | None = None,
) -> dict[str, Any]:
    rpc_name = "cp_import_payload_with_token" if ingest_token else "cp_import_payload"
    url = supabase_url.rstrip("/") + f"/rest/v1/rpc/{rpc_name}"
    body_payload = {"ingest_token": ingest_token, "payload": payload} if ingest_token else {"payload": payload}
    body = json.dumps(body_payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Supabase RPC failed with HTTP {exc.code}: {error_body}") from exc
    if not raw:
        return {}
    decoded = json.loads(raw)
    if isinstance(decoded, list) and decoded:
        return decoded[0]
    if isinstance(decoded, dict):
        return decoded
    return {"result": decoded}


def main() -> int:
    parser = argparse.ArgumentParser(description="Upload parsed Coupang messages to Supabase.")
    parser.add_argument("--payload-json", required=True, type=Path)
    parser.add_argument("--source-path", required=True)
    parser.add_argument("--source-device", default=os.uname().nodename)
    parser.add_argument("--batch-size", type=int, default=100)
    parser.add_argument("--timeout", type=int, default=120)
    parser.add_argument("--supabase-url", default=os.environ.get("SUPABASE_URL"))
    parser.add_argument(
        "--supabase-key",
        default=(
            os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
            or os.environ.get("SUPABASE_SECRET_KEY")
            or os.environ.get("SUPABASE_KEY")
        ),
        help="Prefer SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY for direct cp_import_payload uploads.",
    )
    parser.add_argument(
        "--publishable-key",
        default=os.environ.get("SUPABASE_PUBLISHABLE_KEY"),
        help="Only used with --ingest-token and the temporary-token RPC path.",
    )
    parser.add_argument("--ingest-token", default=os.environ.get("CP_INGEST_TOKEN"))
    args = parser.parse_args()

    supabase_key = args.supabase_key or (args.publishable_key if args.ingest_token else None)
    if not args.supabase_url or not supabase_key:
        print(
            "SUPABASE_URL and a Supabase secret/service key are required. "
            "SUPABASE_PUBLISHABLE_KEY is only valid with CP_INGEST_TOKEN.",
            file=sys.stderr,
        )
        return 2

    messages = json.loads(args.payload_json.read_text(encoding="utf-8"))
    if not isinstance(messages, list):
        print("Payload JSON must contain a list of messages.", file=sys.stderr)
        return 2

    totals = {"messages": 0, "orders": 0, "items": 0}
    import_run_id: int | None = None
    batch_count = (len(messages) + args.batch_size - 1) // args.batch_size

    for batch_index, batch in enumerate(chunked(messages, args.batch_size), start=1):
        payload: dict[str, Any] = {
            "source_path": args.source_path,
            "source_device": args.source_device,
            "parser_version": PARSER_VERSION,
            "batch_label": f"{batch_index:04d}",
            "mail_file_count": len(messages),
            "messages": batch,
            "notes": {"generated_by": PARSER_VERSION, "upload_batch_count": batch_count},
        }
        if import_run_id is not None:
            payload["import_run_id"] = import_run_id

        result = post_rpc(args.supabase_url, supabase_key, payload, args.timeout, args.ingest_token)
        if import_run_id is None and result.get("import_run_id") is not None:
            import_run_id = int(result["import_run_id"])

        totals["messages"] += int(result.get("messages", 0))
        totals["orders"] += int(result.get("orders", 0))
        totals["items"] += int(result.get("items", 0))
        print(
            json.dumps(
                {
                    "batch": batch_index,
                    "batches": batch_count,
                    "import_run_id": import_run_id,
                    "result": result,
                    "totals": totals,
                },
                ensure_ascii=False,
            ),
            flush=True,
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
