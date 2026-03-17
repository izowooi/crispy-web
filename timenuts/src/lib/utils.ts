/**
 * YYYY-MM-DD 형식으로 날짜 반환
 */
export function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * 이번 주 일요일부터 2주치 날짜 배열 반환
 */
export function getTwoWeekDates(baseDate: Date): Date[] {
  const start = new Date(baseDate)
  const day = start.getDay() // 0=일요일
  start.setDate(start.getDate() - day) // 이번 주 일요일로

  const dates: Date[] = []
  for (let i = 0; i < 14; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    dates.push(d)
  }
  return dates
}

/**
 * 해당 월의 캘린더 날짜 배열 반환 (앞뒤 빈칸 포함)
 */
export function getMonthDates(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPad = firstDay.getDay() // 0=일요일
  const endPad = 6 - lastDay.getDay()

  const dates: (Date | null)[] = []
  for (let i = 0; i < startPad; i++) dates.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) dates.push(new Date(year, month, d))
  for (let i = 0; i < endPad; i++) dates.push(null)
  return dates
}

/**
 * 6자리 랜덤 초대 코드 생성
 */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

/**
 * 한국어 날짜 표시 (예: 3월 18일 화요일)
 */
export function formatKoreanDate(date: Date): string {
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${days[date.getDay()]}요일`
}
