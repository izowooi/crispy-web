import Link from 'next/link';
import { getSession } from '@/lib/auth/session';

export const runtime = 'edge';

export default async function AdminPage() {
  const user = await getSession();

  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-bold">관리자</h1>
      {user && (
        <p className="mt-1 text-sm text-muted">{user.name} ({user.email})</p>
      )}

      <div className="mt-6 space-y-3">
        <Link
          href="/admin/upload"
          className="flex items-center gap-3 rounded-xl border border-border p-4 hover:bg-foreground/5"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground/10">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div>
            <p className="font-medium">사진 업로드</p>
            <p className="text-xs text-muted">새 포스트를 작성합니다</p>
          </div>
        </Link>

        <Link
          href="/admin/posts"
          className="flex items-center gap-3 rounded-xl border border-border p-4 hover:bg-foreground/5"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground/10">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </div>
          <div>
            <p className="font-medium">포스트 관리</p>
            <p className="text-xs text-muted">포스트 수정, 삭제, 순서 변경</p>
          </div>
        </Link>

        <Link
          href="/admin/categories"
          className="flex items-center gap-3 rounded-xl border border-border p-4 hover:bg-foreground/5"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground/10">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7a2 2 0 0 1 2-2h3l2 2h9a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </svg>
          </div>
          <div>
            <p className="font-medium">카테고리 관리</p>
            <p className="text-xs text-muted">대분류, 소분류 추가·수정·삭제</p>
          </div>
        </Link>

        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl border border-border p-4 hover:bg-foreground/5"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground/10">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div>
            <p className="font-medium">피드로 돌아가기</p>
            <p className="text-xs text-muted">메인 페이지로 이동합니다</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
