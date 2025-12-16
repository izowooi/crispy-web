import Link from 'next/link';

const testPages = [
  {
    href: '/test/player',
    title: '오디오 플레이어',
    description: '재생/일시정지, 진행바, 볼륨, 재생속도 테스트',
    emoji: '🎵',
  },
  {
    href: '/test/r2',
    title: 'R2 연결',
    description: 'metadata.json fetch, 오디오 파일 스트리밍 테스트',
    emoji: '☁️',
  },
  {
    href: '/test/theme',
    title: '다크모드',
    description: '테마 전환, 시스템 설정 감지 테스트',
    emoji: '🌙',
  },
  {
    href: '/test/auth',
    title: 'Google 로그인',
    description: 'Google OAuth 로그인/로그아웃, 권한 확인',
    emoji: '🔐',
  },
  {
    href: '/test/upload',
    title: '파일 업로드',
    description: '관리자 인증 후 오디오 파일 업로드 테스트',
    emoji: '📤',
  },
];

export default function TestPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-screen-md mx-auto">
        <div className="mb-8">
          <Link
            href="/"
            className="text-primary hover:underline mb-4 inline-block"
          >
            ← 홈으로
          </Link>
          <h1 className="text-3xl font-bold text-foreground mb-2">테스트 대시보드</h1>
          <p className="text-foreground/60">
            각 기능을 개별적으로 테스트할 수 있습니다.
          </p>
        </div>

        <div className="grid gap-4">
          {testPages.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className="block p-6 bg-card-bg border border-card-border rounded-xl hover:shadow-lg hover:scale-[1.01] transition-all"
            >
              <div className="flex items-center gap-4">
                <span className="text-4xl">{page.emoji}</span>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {page.title}
                  </h2>
                  <p className="text-foreground/60 text-sm">{page.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Environment info */}
        <div className="mt-8 p-4 bg-card-bg border border-card-border rounded-xl">
          <h3 className="font-semibold text-foreground mb-2">환경 정보</h3>
          <div className="text-sm text-foreground/60 space-y-1">
            <p>
              <span className="font-medium">R2 URL:</span>{' '}
              {process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '(설정되지 않음)'}
            </p>
            <p>
              <span className="font-medium">Google Client ID:</span>{' '}
              {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? '설정됨' : '(설정되지 않음)'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
