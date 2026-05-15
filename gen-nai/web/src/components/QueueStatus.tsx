"use client";

import { useEffect, useState } from "react";
import type { JobStatus } from "@/lib/types";

type Props = {
  jobId: string | null;
  onDone?: (job: Extract<JobStatus, { status: "done" }>) => void;
  onFailed?: (job: Extract<JobStatus, { status: "failed" }>) => void;
};

export function QueueStatus({ jobId, onDone, onFailed }: Props) {
  const [status, setStatus] = useState<JobStatus | null>(null);

  useEffect(() => {
    if (!jobId) {
      setStatus(null);
      return;
    }
    let stop = false;
    async function loop() {
      while (!stop) {
        try {
          const r = await fetch(`/api/job/${encodeURIComponent(jobId!)}`);
          const j = (await r.json()) as JobStatus;
          if (stop) return;
          setStatus(j);
          if (j.status === "done") {
            onDone?.(j);
            return;
          }
          if (j.status === "failed") {
            onFailed?.(j);
            return;
          }
        } catch {
          // 네트워크 일시 오류 — 재시도
        }
        await new Promise((res) => setTimeout(res, 1500));
      }
    }
    loop();
    return () => {
      stop = true;
    };
  }, [jobId, onDone, onFailed]);

  if (!jobId || !status) return null;

  return (
    <div className="rounded-lg border border-[var(--color-bg-elev-2)] bg-[var(--color-bg-elev)] p-4 text-sm">
      {status.status === "queued" && (
        <div className="flex items-center gap-2">
          <span className="inline-block size-2 animate-pulse rounded-full bg-[var(--color-accent-2)]" />
          <span>대기 중 — {status.position}번째</span>
        </div>
      )}
      {status.status === "processing" && (
        <div className="flex items-center gap-2">
          <span className="inline-block size-2 animate-pulse rounded-full bg-[var(--color-accent)]" />
          <span>생성 중...</span>
        </div>
      )}
      {status.status === "done" && (
        <div className="flex items-center gap-2 text-[var(--color-accent)]">
          <span>✓ 완료</span>
        </div>
      )}
      {status.status === "failed" && (
        <div className="flex flex-col gap-1 text-red-400">
          <span>✗ 실패</span>
          <span className="text-xs text-[var(--color-fg-dim)]">{status.error}</span>
        </div>
      )}
    </div>
  );
}
