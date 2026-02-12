import type { StylePreset } from './types';

/**
 * 20개 스타일 프리셋 정의
 * research-claude-2.md의 프롬프트 기반
 */
export const STYLE_PRESETS: StylePreset[] = [
  {
    id: '90s-cartoon',
    name: '90년대 카툰',
    prompt: 'Make this a 90s Saturday morning cartoon with bold outlines, bright flat colors, and exaggerated expressions',
    category: 'cartoon',
    description: '90년대 토요일 아침 만화 감성',
  },
  {
    id: 'studio-ghibli',
    name: '스튜디오 지브리',
    prompt: 'Transform to Studio Ghibli anime style with soft watercolor tones, lush detail, and dreamlike lighting',
    category: 'cartoon',
    description: '지브리풍 수채화 감성',
  },
  {
    id: 'lego',
    name: '레고 스타일',
    prompt: 'Restyle as a LEGO brick diorama with colorful plastic brick construction and minifigure characters',
    category: 'material',
    description: '레고 미니피규어 세계관',
  },
  {
    id: 'simpsons',
    name: '심슨 카툰',
    prompt: 'Convert to Simpsons cartoon style with yellow skin, large round eyes, overbites, and Springfield background',
    category: 'cartoon',
    description: '심슨 특유의 노란 피부 표현',
  },
  {
    id: 'pixar',
    name: '픽사 3D',
    prompt: 'Transform to Pixar-style 3D animation with big expressive eyes, soft shadows, and vibrant colors',
    category: 'cartoon',
    description: '픽사 캐릭터 스타일',
  },
  {
    id: 'van-gogh',
    name: '반 고흐',
    prompt: 'Make this a Van Gogh painting with swirling brushstrokes, thick impasto texture, and vivid blues and yellows',
    category: 'art',
    description: '반 고흐 후기인상주의',
  },
  {
    id: 'synthwave',
    name: '80년대 신스웨이브',
    prompt: 'Restyle in 1980s synthwave aesthetic with neon pink and purple glow, chrome reflections, and retro grid lines',
    category: 'vintage',
    description: '80년대 신스웨이브',
  },
  {
    id: 'pixel-art',
    name: '픽셀 아트',
    prompt: 'Convert to retro 8-bit pixel art with limited color palette, visible pixel blocks, and NES game aesthetic',
    category: 'game',
    description: '레트로 8비트 게임풍',
  },
  {
    id: 'action-figure',
    name: '액션 피규어',
    prompt: 'Transform into a collectible action figure inside retail packaging with clear plastic window and accessories display',
    category: 'viral',
    description: '액션 피규어 박스 (2025 바이럴 트렌드)',
  },
  {
    id: 'claymation',
    name: '클레이메이션',
    prompt: 'Make this a claymation scene with sculpted clay textures, slightly imperfect surfaces, and stop-motion feel',
    category: 'material',
    description: '클레이메이션 스톱모션',
  },
  {
    id: 'ukiyo-e',
    name: '우키요에',
    prompt: 'Restyle as a traditional Japanese Ukiyo-e woodblock print with flat colors, bold outlines, and elegant composition',
    category: 'art',
    description: '일본 우키요에 판화',
  },
  {
    id: 'pop-art',
    name: '팝아트',
    prompt: 'Convert to Andy Warhol-inspired pop art with high contrast, bold color blocks, and halftone dots',
    category: 'art',
    description: '워홀 팝아트',
  },
  {
    id: 'pencil-sketch',
    name: '연필 스케치',
    prompt: 'Transform to pencil sketch with natural graphite lines, detailed cross-hatching, and visible paper texture',
    category: 'material',
    description: '연필 스케치 드로잉',
  },
  {
    id: 'travel-poster',
    name: '빈티지 여행 포스터',
    prompt: 'Make this a vintage 1950s travel poster with simplified scenic art, flat bold colors, and retro typography',
    category: 'vintage',
    description: '50년대 빈티지 여행 포스터',
  },
  {
    id: 'stained-glass',
    name: '스테인드 글라스',
    prompt: 'Restyle as a stained glass window with bold black lead lines, translucent jewel-colored segments, and luminous glow',
    category: 'material',
    description: '스테인드 글라스 성당 창',
  },
  {
    id: 'tim-burton',
    name: '팀 버튼 고딕',
    prompt: 'Convert to Tim Burton gothic style with elongated limbs, dark whimsical atmosphere, pale skin, and large dark eyes',
    category: 'cartoon',
    description: '팀 버튼 고딕 애니메이션',
  },
  {
    id: 'gta',
    name: 'GTA 로딩 스크린',
    prompt: 'Transform into a GTA loading screen with stylized realism, thick outlines, urban gritty tones, and street aesthetic',
    category: 'game',
    description: 'GTA 로딩 스크린',
  },
  {
    id: 'knitted',
    name: '니트 인형',
    prompt: 'Make this a knitted wool doll with yarn textures, button eyes, stitched details, and cozy handcrafted feel',
    category: 'material',
    description: '니트 인형 (뜨개질)',
  },
  {
    id: 'renaissance',
    name: '르네상스',
    prompt: 'Restyle as a dramatic Renaissance oil painting with classical composition, rich fabrics, and masterful chiaroscuro lighting',
    category: 'art',
    description: '르네상스 초상화',
  },
  {
    id: 'psychedelic',
    name: '사이키델릭',
    prompt: 'Convert to 1960s psychedelic poster with swirling rainbow colors, trippy melting patterns, and flower-power vibes',
    category: 'vintage',
    description: '60년대 사이키델릭',
  },
];

/**
 * ID로 스타일 프리셋 찾기
 */
export function getStyleById(id: string): StylePreset | undefined {
  return STYLE_PRESETS.find(style => style.id === id);
}

/**
 * 카테고리별로 스타일 프리셋 그룹화
 */
export function getStylesByCategory(): Record<string, StylePreset[]> {
  return STYLE_PRESETS.reduce((acc, style) => {
    if (!acc[style.category]) {
      acc[style.category] = [];
    }
    acc[style.category].push(style);
    return acc;
  }, {} as Record<string, StylePreset[]>);
}

/**
 * 카테고리 한글 이름
 */
export const CATEGORY_NAMES: Record<string, string> = {
  cartoon: '카툰/애니메이션',
  art: '예술 사조',
  vintage: '빈티지',
  material: '소재/물질',
  game: '게임',
  viral: '바이럴/펀',
};
