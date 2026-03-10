import Link from 'next/link';

interface HeaderProps {
  title: string;
  backHref?: string;
}

export default function Header({ title, backHref }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background px-4 py-3">
      <div className="flex items-center gap-2">
        {backHref && (
          <Link href={backHref} className="text-muted hover:text-foreground">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
        )}
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
    </header>
  );
}
