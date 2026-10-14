/* eslint-disable @next/next/no-img-element */

/**
 * Approved label + white ChatGPT logo per the Sign in with ChatGPT UI guidelines.
 * A plain link: the server route starts OAuth with a full-page navigation.
 */
export function ChatGPTButton({ size = "lg", href = "/auth/chatgpt" }: { size?: "sm" | "lg"; href?: string }) {
  return (
    <a
      href={href}
      className={`group inline-flex items-center justify-center gap-2.5 rounded-full bg-black font-semibold text-white ring-1 ring-white/20 transition hover:bg-[#151515] hover:ring-white/40 active:scale-[0.98] ${
        size === "lg" ? "h-12 px-6 text-[0.95rem]" : "h-8 px-3.5 text-xs"
      }`}
    >
      <img
        src="/brand/chatgpt-logo-white.svg"
        alt=""
        className={size === "lg" ? "size-5" : "size-3.5"}
        draggable={false}
      />
      Continue with ChatGPT
    </a>
  );
}
