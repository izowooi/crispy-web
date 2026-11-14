import { memo, useState, type ReactNode } from "react";
import type { Bookmark } from "./api";
import { displayTitle, exactTime, relativeTime } from "./format";
import { CheckIcon, ExternalIcon, GlobeIcon, LinkIcon, NoteIcon, TrashIcon, UndoIcon } from "./icons";

type Props = {
  item: Bookmark;
  selected: boolean;
  leaving: boolean;
  saving: boolean;
  showReadBadge: boolean;
  now: number;
  onSelect: (id: string) => void;
  onToggleRead: (item: Bookmark) => void;
  onDelete: (item: Bookmark) => void;
  onCopy: (item: Bookmark) => void;
};

export const BookmarkRow = memo(function BookmarkRow({
  item,
  selected,
  leaving,
  saving,
  showReadBadge,
  now,
  onSelect,
  onToggleRead,
  onDelete,
  onCopy,
}: Props) {
  const title = displayTitle(item);
  const isRead = item.readAt !== null;
  const memoBody = !item.url && !item.title.trim() ? item.note.split("\n").slice(1).join(" ").trim() : item.note.trim();
  const description = item.url ? item.description.trim() : "";

  return (
    <li className={`zk-row-wrap ${leaving ? "zk-leaving" : ""}`} aria-hidden={leaving || undefined}>
      <div>
        <article
          id={`bm-${item.id}`}
          aria-current={selected || undefined}
          onClick={(e) => {
            if (!(e.target as HTMLElement).closest("a,button")) onSelect(item.id);
          }}
          className={`group relative flex flex-wrap gap-x-4 gap-y-2 rounded-xl px-3 py-3 scroll-mt-36 scroll-mb-20 transition-colors sm:flex-nowrap sm:px-4 sm:py-3.5 ${
            selected
              ? "bg-indigo-50/70 ring-2 ring-inset ring-indigo-500/70 dark:bg-indigo-500/10 dark:ring-indigo-400/60"
              : "hover:bg-gray-50 dark:hover:bg-gray-900/70"
          } ${saving ? "opacity-70" : ""}`}
        >
          <Thumb item={item} title={title} />

          <div className="min-w-0 flex-1">
            <h2 className={`text-[15px] leading-snug font-semibold ${isRead && showReadBadge ? "text-gray-500 dark:text-gray-400" : "text-gray-900 dark:text-gray-100"}`}>
              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="line-clamp-2 rounded-sm hover:underline decoration-gray-300 underline-offset-2 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:decoration-gray-600"
                >
                  {title}
                </a>
              ) : (
                <span className="line-clamp-2">{title}</span>
              )}
            </h2>

            {memoBody && (
              <p className="mt-1 line-clamp-2 text-sm leading-relaxed whitespace-pre-line text-gray-700 dark:text-gray-300">
                {memoBody}
              </p>
            )}
            {description && (
              <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-gray-500 dark:text-gray-400">{description}</p>
            )}

            <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              {item.url ? <Favicon src={item.favicon} /> : <NoteIcon className="size-3.5 shrink-0" />}
              <span className="truncate">{item.url ? item.siteName || item.domain : "메모"}</span>
              <span aria-hidden="true">·</span>
              <time className="shrink-0" dateTime={new Date(item.createdAt).toISOString()} title={exactTime(item.createdAt)}>
                {saving ? "저장 중…" : relativeTime(item.createdAt, now)}
              </time>
              {isRead && showReadBadge && (
                <span className="ml-1 shrink-0 rounded-full bg-gray-100 px-1.5 py-px text-[11px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  읽음
                </span>
              )}
            </div>
          </div>

          <div
            className={`flex w-full shrink-0 items-start justify-end gap-0.5 transition-opacity sm:w-auto sm:self-center ${
              selected ? "" : "sm:opacity-60 sm:group-hover:opacity-100 sm:focus-within:opacity-100"
            }`}
          >
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                title="열기 (o)"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-indigo-700 transition hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:text-indigo-300 dark:hover:bg-indigo-500/15"
              >
                <ExternalIcon className="size-[15px]" />
                열기
              </a>
            )}
            <ActionButton
              label={isRead ? "안읽음으로 표시" : "읽음으로 표시"}
              hint="e"
              onClick={() => onToggleRead(item)}
              disabled={saving}
            >
              {isRead ? <UndoIcon className="size-[17px]" /> : <CheckIcon className="size-[17px]" />}
            </ActionButton>
            {item.url && (
              <ActionButton label="링크 복사" hint="c" onClick={() => onCopy(item)}>
                <LinkIcon className="size-[17px]" />
              </ActionButton>
            )}
            <ActionButton label="삭제" hint="#" onClick={() => onDelete(item)} disabled={saving} danger>
              <TrashIcon className="size-[17px]" />
            </ActionButton>
          </div>
        </article>
      </div>
    </li>
  );
});

function ActionButton({
  label,
  hint,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={`${label} (${hint})`}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex size-8 items-center justify-center rounded-lg text-gray-500 transition focus-visible:outline-2 focus-visible:outline-indigo-500 disabled:opacity-40 dark:text-gray-400 ${
        danger
          ? "hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/15 dark:hover:text-red-400"
          : "hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100"
      }`}
    >
      {children}
    </button>
  );
}

function Thumb({ item, title }: { item: Bookmark; title: string }) {
  const [failed, setFailed] = useState(false);
  const [iconFailed, setIconFailed] = useState(false);
  const box =
    "relative flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 sm:h-[72px] sm:w-28 dark:bg-gray-800/80";

  const inner =
    item.image && !failed ? (
      <img
        src={item.image}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="size-full object-cover"
      />
    ) : item.url && item.favicon && !iconFailed ? (
      <img
        src={item.favicon}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setIconFailed(true)}
        className="size-8 rounded-md object-contain"
      />
    ) : item.url ? (
      <span className="text-lg font-semibold text-gray-400 uppercase dark:text-gray-500">
        {(item.siteName || title).slice(0, 1)}
      </span>
    ) : (
      <NoteIcon className="size-6 text-gray-400 dark:text-gray-500" />
    );

  if (!item.url) return <div className={box}>{inner}</div>;
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden="true" className={box}>
      {inner}
    </a>
  );
}

function Favicon({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <GlobeIcon className="size-3.5 shrink-0" />;
  return (
    <img
      src={src}
      alt=""
      width={14}
      height={14}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="size-3.5 shrink-0 rounded-sm"
    />
  );
}
