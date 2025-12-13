import { AppInfo } from '@/components/AppDrawer/types'

export const APPS: AppInfo[] = [
  {
    id: 'ladder',
    name: '사다리타기',
    description: '공정한 추첨을 위한 랜덤 사다리 게임',
    url: 'https://ladderi.pages.dev/',
    icon: '🪜',
    color: '#f9a825',
  },
  {
    id: 'manitto',
    name: '마니또',
    description: '비밀 친구를 자동으로 매칭해주는 웹 애플리케이션',
    url: 'https://manitto.pages.dev/',
    icon: '🎁',
    color: '#e53e3e',
  },
  {
    id: 'reaction',
    name: '반응속도 테스트',
    description: '당신의 반응속도를 정밀하게 측정하고 등급을 확인해보세요!',
    url: 'https://reactioni.pages.dev/',
    icon: '⚡',
    color: '#38bdf8',
  },
]

// 현재 프로젝트를 제외한 앱 목록을 반환하는 유틸리티 함수
export function getOtherApps(currentAppId: string): AppInfo[] {
  return APPS.filter(app => app.id !== currentAppId)
}
