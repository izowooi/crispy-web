/* eslint-disable @next/next/no-img-element */

/**
 * Approved label + white ChatGPT logo per the Sign in with ChatGPT UI guidelines.
 * A plain link: the server route starts OAuth with a full-page navigation.
 * `pending`: shown on the hosted site, where plan usage awaits OpenAI's review, so it can't be used yet.
 */
export function ChatGPTButton({
  size = "lg",
  href = "/auth/chatgpt",
  pending = false,
}: {
  size?: "sm" | "lg";
  href?: string;
  pending?: boolean;
}) {
  const className = `group inline-flex items-center justify-center gap-2.5 rounded-full bg-black font-semibold text-white ring-1 ring-white/20 transition ${
    size === "lg" ? "h-12 px-6 text-[0.95rem]" : "h-8 px-3.5 text-xs"
  } ${pending ? "cursor-not-allowed opacity-55" : "hover:bg-[#151515] hover:ring-white/40 active:scale-[0.98]"}`;
  const content = (
    <>
      <img src="/brand/chatgpt-logo-white.svg" alt="" className={size === "lg" ? "size-5" : "size-3.5"} draggable={false} />
      Continue with ChatGPT
      {pending && (
        <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[0.6rem] font-bold tracking-wide text-white/80">심사 중</span>
      )}
    </>
  );
  if (pending) {
    return (
      <button type="button" disabled aria-describedby="siwc-pending-note" className={className}>
        {content}
      </button>
    );
  }
  return (
    <a href={href} className={className}>
      {content}
    </a>
  );
}

/** Why the button above is disabled on the hosted site. */
export const SIWC_PENDING_NOTE = "ChatGPT 로그인은 OpenAI 심사 중이라 지금은 내 PC에서 실행할 때만 동작해요.";
