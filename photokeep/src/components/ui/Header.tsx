import { getSession } from '@/lib/auth/session';

interface HeaderProps {
  title: string;
}

export default async function Header({ title }: HeaderProps) {
  const user = await getSession();

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-4 py-3">
      <h1 className="text-lg font-semibold">{title}</h1>
      {user ? (
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={user.picture}
            alt={user.name}
            className="h-7 w-7 rounded-full"
            referrerPolicy="no-referrer"
          />
          <span className="text-xs text-muted">{user.name}</span>
          <a
            href="/api/auth/logout"
            className="ml-1 text-xs text-muted hover:text-foreground"
          >
            로그아웃
          </a>
        </div>
      ) : (
        <a href="/login" className="text-xs text-muted hover:text-foreground">
          로그인
        </a>
      )}
    </header>
  );
}
