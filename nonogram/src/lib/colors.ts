// 색상 코드 -> HEX 매핑
export const COLOR_HEX: Record<number, string> = {
  0: 'transparent',
  1: '#000000', // 검정
  2: '#FF0000', // 빨강
  3: '#0000FF', // 파랑
  4: '#00AA00', // 초록
  5: '#FFD700', // 노랑
  6: '#FFA500', // 주황
  7: '#800080', // 보라
  8: '#8B4513', // 갈색
};

// 색상 코드 -> 한글 이름
export const COLOR_NAMES: Record<number, string> = {
  0: '공백',
  1: '검정',
  2: '빨강',
  3: '파랑',
  4: '초록',
  5: '노랑',
  6: '주황',
  7: '보라',
  8: '갈색',
};

// 인쇄 시 가독성을 위한 텍스트 색상
export const TEXT_COLOR: Record<number, string> = {
  0: '#999999',
  1: '#000000',
  2: '#CC0000',
  3: '#0000CC',
  4: '#008800',
  5: '#CC9900',
  6: '#DD6600',
  7: '#660066',
  8: '#663300',
};

export function getColorHex(colorCode: number): string {
  return COLOR_HEX[colorCode] || COLOR_HEX[0];
}

export function getColorName(colorCode: number): string {
  return COLOR_NAMES[colorCode] || '알수없음';
}

export function getTextColor(colorCode: number): string {
  return TEXT_COLOR[colorCode] || TEXT_COLOR[0];
}

// 그리드에서 사용된 색상 추출
export function getUsedColors(grid: number[][]): number[] {
  const colors = new Set<number>();
  for (const row of grid) {
    for (const cell of row) {
      if (cell !== 0) {
        colors.add(cell);
      }
    }
  }
  return Array.from(colors).sort((a, b) => a - b);
}
