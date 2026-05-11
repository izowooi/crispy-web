// 클라이언트 노출용 스타일 메타데이터.
// 이 파일은 클라이언트 컴포넌트에서 자유롭게 import 가능하다.
// prompt 시드는 절대 포함하지 않는다 — `src/lib/stylePrompts.ts`(서버 전용)에서 관리.

export type StyleCategoryId =
  | "id_photo"
  | "illust_paint"
  | "character_figure"
  | "anime_manga"
  | "bw_sculpture"
  | "glamour_beauty"
  | "art_experimental";

export type StyleMeta = {
  readonly id: string;
  readonly label: string;
  readonly category: StyleCategoryId;
  readonly description: string;
  readonly thumb?: string;
};

export const CATEGORIES = [
  { id: "id_photo", label: "증명사진" },
  { id: "illust_paint", label: "일러스트·페인팅" },
  { id: "character_figure", label: "캐릭터·피규어" },
  { id: "anime_manga", label: "애니메이션·만화" },
  { id: "bw_sculpture", label: "흑백·조각" },
  { id: "glamour_beauty", label: "글래머·뷰티" },
  { id: "art_experimental", label: "예술·실험" },
] as const satisfies readonly { readonly id: StyleCategoryId; readonly label: string }[];

export const STYLES = [
  // 증명사진 (3)
  {
    id: "id_photo_basic",
    label: "일반 증명사진",
    category: "id_photo",
    description: "단정한 정면 구도, 무채색 배경, 자연광 ID 사진.",
  },
  {
    id: "passport",
    label: "여권사진",
    category: "id_photo",
    description: "무표정·정면·흰 배경의 표준 여권 규격 사진.",
  },
  {
    id: "business_profile",
    label: "비즈니스 프로필",
    category: "id_photo",
    description: "회사 홈페이지·링크드인용 정장 프로필.",
  },
  // 일러스트·페인팅 (2)
  {
    id: "watercolor",
    label: "수채화 일러스트",
    category: "illust_paint",
    description: "번짐 효과와 부드러운 색감의 손그림 풍.",
  },
  {
    id: "oil_painting",
    label: "유화",
    category: "illust_paint",
    description: "두꺼운 질감의 클래식 유화 초상화.",
  },
  // 캐릭터·피규어 (2)
  {
    id: "3d_character",
    label: "3D 캐릭터",
    category: "character_figure",
    description: "픽사풍 셀룰로이드 셰이딩의 3D 캐릭터.",
  },
  {
    id: "chibi_sticker",
    label: "치비 스티커",
    category: "character_figure",
    description: "큰 머리·작은 몸의 귀여운 스티커.",
  },
  // 애니메이션·만화 (2)
  {
    id: "anime_pastel",
    label: "파스텔 애니메이션",
    category: "anime_manga",
    description: "일본 애니풍 부드러운 파스텔 셀.",
  },
  {
    id: "manga_inking",
    label: "흑백 만화",
    category: "anime_manga",
    description: "잉크 라인과 스크린톤의 흑백 만화 컷.",
  },
  // 흑백·조각 (2)
  {
    id: "bw_studio",
    label: "흑백 스튜디오",
    category: "bw_sculpture",
    description: "고대비 흑백 스튜디오 포트레이트.",
  },
  {
    id: "marble_bust",
    label: "대리석 흉상",
    category: "bw_sculpture",
    description: "그리스 조각상 스타일의 대리석 흉상.",
  },
  // 글래머·뷰티 (2)
  {
    id: "kbeauty_glow",
    label: "K-뷰티 글로우",
    category: "glamour_beauty",
    description: "윤기 있는 피부와 자연스러운 메이크업의 K-뷰티 룩.",
  },
  {
    id: "editorial_glam",
    label: "에디토리얼 글램",
    category: "glamour_beauty",
    description: "패션지 표지풍 강한 라이팅의 글래머 컷.",
  },
  // 예술·실험 (2)
  {
    id: "pixel_8bit",
    label: "8비트 픽셀",
    category: "art_experimental",
    description: "레트로 게임 도트풍 픽셀 아바타.",
  },
  {
    id: "lowpoly_geo",
    label: "로우폴리",
    category: "art_experimental",
    description: "기하학적 면 분할의 로우폴리 3D.",
  },
] as const satisfies readonly StyleMeta[];

export const STYLE_IDS = STYLES.map((s) => s.id) as readonly string[];

const STYLE_ID_SET: ReadonlySet<string> = new Set(STYLE_IDS);

export function isKnownStyleId(id: string): boolean {
  return STYLE_ID_SET.has(id);
}

export function getStylesByCategory(
  categoryId: StyleCategoryId
): readonly StyleMeta[] {
  return STYLES.filter((s) => s.category === categoryId);
}
