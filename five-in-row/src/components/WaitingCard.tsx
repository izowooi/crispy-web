import { useState } from "react";
import { DOUBLE_THREE_TEXT, type Color, type GameSnapshot } from "../../shared/types";
import { formatTimeControl } from "../lib/format";
import { IconCopy, IconShare } from "./Icons";

interface Props {
  snap: GameSnapshot;
  you: Color | null;
  joining: boolean;
  onJoin: () => void;
  onCancel: () => void;
}

export function WaitingCard({ snap, you, joining, onJoin, onCancel }: Props) {
  const [copied, setCopied] = useState(false);
  const link = `${location.origin}/#/game/${snap.id}`;
  const host = snap.openSeat === "w" ? snap.black : snap.white;
  const hostName = host.kind === "human" ? host.name ?? "익명" : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("링크를 복사하세요", link);
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: "오목 한 판 해요!", text: `${hostName} 님이 오목 대국을 신청했어요`, url: link });
    } catch {
      // user dismissed the share sheet
    }
  };

  if (you) {
    return (
      <div className="board-overlay">
        <div className="waiting-card">
          <div className="waiting-dots" aria-hidden="true"><i /><i /><i /></div>
          <strong>상대를 기다리는 중</strong>
          <p>{snap.listed ? "로비에 공개된 방이에요. 링크로 친구를 바로 부를 수도 있어요." : "아래 링크를 받은 사람만 들어올 수 있어요."}</p>
          <div className="share-link">
            <code>{link.replace(/^https?:\/\//, "")}</code>
          </div>
          <div className="waiting-actions">
            <button className="btn primary" onClick={copy}>
              <IconCopy /> {copied ? "복사했어요!" : "링크 복사"}
            </button>
            {"share" in navigator && (
              <button className="btn" onClick={share}>
                <IconShare /> 공유
              </button>
            )}
          </div>
          <button className="link" onClick={onCancel}>방 닫기</button>
        </div>
      </div>
    );
  }

  return (
    <div className="board-overlay">
      <div className="waiting-card">
        <strong>{hostName} 님의 대국 신청</strong>
        <p>
          {formatTimeControl(snap.initialMs, snap.incrementMs)} · {DOUBLE_THREE_TEXT[snap.doubleThree].short} · 나는 <b>{snap.openSeat === "w" ? "백" : "흑 (먼저 둠)"}</b>
        </p>
        <button className="btn primary big" disabled={joining} onClick={onJoin}>
          {joining ? "참가하는 중…" : "참가해서 대국 시작"}
        </button>
      </div>
    </div>
  );
}
