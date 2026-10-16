import {
  MALE_FANTASY_CHARACTERS,
  MALE_MODERN_CHARACTERS,
  MALE_THEME_METADATA,
} from './maleCharacters';

export type CharacterTheme = 'fantasy' | 'modern' | 'male_fantasy' | 'male_modern';

export type WorldTheme =
  | 'fantasy'
  | 'modern'
  | 'all'
  | 'male_fantasy'
  | 'male_modern'
  | 'all_male'
  | 'grand_all';

export type EditionType = 'heroine' | 'hero' | 'grand';

export interface CharacterStats {
  charm: number;      // 매력도
  affection: number;  // 헌신/애정도
  intellect: number;  // 지성/책략
  aura: number;       // 카리스마/기품
  mystery: number;    // 신비도/반전매력
}

export interface Character {
  id: string;
  theme: CharacterTheme;
  gender?: 'female' | 'male';
  name: string;
  englishName: string;
  title: string;
  faction: string;
  role: string;
  age: string;
  mbti: string;
  location: string;
  image: string;
  accentColor: string;
  glowColor: string;
  badgeText: string;
  tags: string[];
  quote: string;
  backstory: string;
  secretNote: string;
  stats: CharacterStats;
}

export interface ThemeMeta {
  id: WorldTheme;
  edition?: EditionType;
  name: string;
  subtitle: string;
  englishTitle: string;
  description: string;
  badge: string;
  primaryColor: string;
  secondaryColor: string;
  ambientQuote: string;
}

export const THEME_METADATA: Record<WorldTheme, ThemeMeta> = {
  fantasy: {
    id: 'fantasy',
    edition: 'heroine',
    name: '서양 중세 판타지 : 아르카디아 연대기',
    subtitle: '검과 마법, 황실 연회장과 대신전의 별빛 아래 펼쳐지는 로맨스 판타지',
    englishTitle: 'CHRONICLES OF ARCADIA',
    description:
      '천 년의 역사를 품은 아르카디아 제국. 대신전의 백은 성녀, 북부 대공가의 흑장미 소공녀, 제1황녀와 마탑주까지—한국 로맨스 판타지 웹툰 감성으로 그려낸 16인의 운명적 히로인.',
    badge: 'HEROINE EDITION · 16강 로판 월드컵',
    primaryColor: '#f59e0b',
    secondaryColor: '#ec4899',
    ambientQuote: '“별빛이 내려앉은 제국의 밤, 당신의 검과 심장이 향할 단 한 사람은 누구입니까?”',
  },
  modern: {
    id: 'modern',
    edition: 'heroine',
    name: '현대 대한민국 : 서울 시네마틱 로맨스',
    subtitle: '연희동 캠퍼스부터 성수동 루프탑, 홍대 인디 클럽까지 서울의 사계절 로맨스',
    englishTitle: 'SEOUL CINEMATIC ROMANCE',
    description:
      '벚꽃 흩날리는 대학 캠퍼스, 화려한 조명 뒤의 아이돌 무대, 연남동의 조용한 테라스 카페와 첫눈 내리는 서초동 거리까지—현대의 대한민국을 배경으로 펼쳐지는 16인의 청춘 로맨스.',
    badge: 'HEROINE EDITION · 16강 현대물 월드컵',
    primaryColor: '#38bdf8',
    secondaryColor: '#f43f5e',
    ambientQuote: '“서울의 수많은 불빛 속, 당신의 계절을 영원히 멈추게 할 단 한 사람은 누구입니까?”',
  },
  all: {
    id: 'all',
    edition: 'heroine',
    name: '히로인 통합 올스타 : 그랜드 월드컵 (32강)',
    subtitle: '서양 중세 판타지 16인 × 현대 대한민국 16인이 격돌하는 히로인 32강 통합 토너먼트',
    englishTitle: 'HEROINE EDITION GRAND TOURNAMENT',
    description:
      '차원과 시대를 초월한 32인의 히로인이 총출동합니다. 중세 로맨스 판타지와 현대 서울의 매력을 한 자리에서 비교하며 궁극의 이상형을 찾아보세요.',
    badge: 'HEROINE ALL-STARS · 32강 / 16강 통합전',
    primaryColor: '#a855f7',
    secondaryColor: '#f59e0b',
    ambientQuote: '“두 개의 세계, 서른두 개의 운명. 모든 차원을 통틀어 당신의 마음을 독차지할 단 한 사람.”',
  },
  ...MALE_THEME_METADATA,
};

export const FANTASY_CHARACTERS: Character[] = [
  {
    id: 'f01',
    theme: 'fantasy',
    name: '엘리아나 폰 아스트레아',
    englishName: 'Eliana von Astrea',
    title: '백은의 성녀',
    faction: '아스트레아 대신전',
    role: '제국 총대주교 후계 · 대신관',
    age: '20세',
    mbti: 'INFJ',
    location: '황도 아스트레아 대성당 스테인드글라스 성소',
    image: '/images/fantasy/f01.jpg',
    accentColor: '#fbbf24',
    glowColor: 'rgba(251, 191, 36, 0.45)',
    badgeText: 'SAINTESS OF STARLIGHT',
    tags: ['#백은의성녀', '#외유내강', '#헌신적순애', '#비밀기도'],
    quote: '“신께 바치는 기도 중 절반은... 사실 당신의 무사 귀환을 바라는 제 사심이었답니다.”',
    backstory:
      '천 년에 한 번 태어난다는 별빛의 성흔을 지닌 대신전의 성녀. 세상 모든 이에게 자애롭고 성스러운 존재로 추앙받지만, 오직 당신 앞에서만 성녀의 무거운 베일을 벗고 수줍은 소녀의 미소를 짓는다. 스테인드글라스 너머로 빛이 쏟아지는 성소에서 매일 당신만을 위한 축복을 내린다.',
    secretNote: '당신이 전장에 나갈 때마다 몰래 자신의 성력을 절반 이상 떼어 당신의 갑옷에 보호 각인을 새겨 넣고 있다.',
    stats: { charm: 98, affection: 100, intellect: 92, aura: 95, mystery: 94 },
  },
  {
    id: 'f02',
    theme: 'fantasy',
    name: '카르밀라 드 녹턴',
    englishName: 'Carmilla de Nocturne',
    title: '북부 대공가의 흑장미',
    faction: '녹턴 북부 대공령',
    role: '북부 소공녀 · 흑장미 기사단장',
    age: '21세',
    mbti: 'INTJ',
    location: '만년설이 내리는 녹턴 대공성 테라스',
    image: '/images/fantasy/f02.jpg',
    accentColor: '#f43f5e',
    glowColor: 'rgba(244, 63, 94, 0.45)',
    badgeText: 'BLACK ROSE OF THE NORTH',
    tags: ['#북부소공녀', '#차도녀', '#집착순애', '#외강내유'],
    quote: '“북부의 겨울은 길고 추워. 그러니 네가 내 곁에 남아서 평생 내 온기를 책임져야겠어.”',
    backstory:
      '만년설이 뒤덮인 제국 북부 국경을 수호하는 녹턴 대공가의 유일한 후계자. 피도 눈물도 없는 얼음의 검희로 불리지만, 유년 시절 자신의 얼어붙은 손을 따뜻하게 감싸주었던 당신을 잊지 못해 황도 사교계까지 직접 검을 차고 찾아왔다.',
    secretNote: '제복 가슴팍에 달린 붉은 흑장미 브로치는 과거 당신이 건네주었던 들꽃을 본떠 만든 마도구다.',
    stats: { charm: 97, affection: 96, intellect: 94, aura: 99, mystery: 91 },
  },
  {
    id: 'f03',
    theme: 'fantasy',
    name: '세라피나 발렌타인',
    englishName: 'Seraphina Valentine',
    title: '홍련의 제1황녀',
    faction: '발렌타인 황실',
    role: '제국 제1황녀 · 태양의 계승자',
    age: '21세',
    mbti: 'ENTJ',
    location: '황궁 루미에르 대연회장 중앙 홀',
    image: '/images/fantasy/f03.jpg',
    accentColor: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.45)',
    badgeText: 'CRIMSON CROWN PRINCESS',
    tags: ['#제1황녀', '#도도한카리스마', '#직진녀', '#황실로맨스'],
    quote: '“짐의 기사에게 패배란 없다. 단, 내 심장을 훔친 죄는 평생 내 곁에서 갚도록 해.”',
    backstory:
      '황금빛 샹들리에보다 더 눈부신 미모와 태양의 마력을 타고난 제국의 제1황녀. 화려한 황궁 연회장에서도 늘 권태로운 미소만 짓던 그녀였으나, 건국기념 검술 대회에서 우승한 당신에게 직접 루비 왕관의 축복을 내리며 자신의 전속 호위기사로 임명했다.',
    secretNote: '연회 도중 귀족들의 눈을 피해 당신과 단둘이 황궁 발코니로 빠져나가는 시간을 가장 기다린다.',
    stats: { charm: 99, affection: 93, intellect: 96, aura: 100, mystery: 88 },
  },
  {
    id: 'f04',
    theme: 'fantasy',
    name: '루시엘라 에르하르트',
    englishName: 'Luciella Erhardt',
    title: '푸른 얼음의 성기사',
    faction: '황립 템플러 기사단',
    role: '제1성기사단 단장 · 소드마스터',
    age: '22세',
    mbti: 'ISTJ',
    location: '햇살이 비치는 왕립 기사단 성관 회랑',
    image: '/images/fantasy/f04.jpg',
    accentColor: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.45)',
    badgeText: 'AZURE SWORD SAINTESS',
    tags: ['#소드마스터', '#기사도', '#쿨뷰티', '#갭모에'],
    quote: '“내 검은 제국을 위해 존재하지만... 내 심장은 오직 그대 한 사람만을 향해 뜁니다.”',
    backstory:
      '스무 살에 제국 최연소 소드마스터의 경지에 오른 귀족 가문의 여기사. 전장에서는 푸른 섬광이라 불리며 적들을 떨게 하지만, 당신과 단둘이 남으면 평소에는 쓰지 않던 존댓말이 무너지며 얼굴을 붉히는 반전 매력을 지녔다.',
    secretNote: '갑옷 안쪽 주머니에 당신과 처음 대련했던 날 떨어진 나뭇잎을 책갈피처럼 소중히 간직하고 있다.',
    stats: { charm: 95, affection: 97, intellect: 90, aura: 98, mystery: 86 },
  },
  {
    id: 'f05',
    theme: 'fantasy',
    name: '아리안느 베르사유',
    englishName: 'Arianne Versailles',
    title: '마탑의 별빛 마녀',
    faction: '제국 중앙 상아 마탑',
    role: '최연소 마탑주 · 성좌 대마법사',
    age: '20세',
    mbti: 'ENTP',
    location: '밤하늘의 별자리가 회전하는 마탑 최상층 천문서고',
    image: '/images/fantasy/f05.jpg',
    accentColor: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.45)',
    badgeText: 'ARCHMAGE OF THE STAR TOWER',
    tags: ['#천재마탑주', '#장난꾸러기', '#신비주의', '#밤의연구실'],
    quote: '“별의 궤적은 모두 계산할 수 있는데, 네가 날 볼 때 내 심장이 왜 이렇게 뛰는지는 어떤 마법 공식으로도 안 풀리네?”',
    backstory:
      '고대 성좌 마법을 독학으로 해독해 역사상 최연소 마탑주에 오른 천재 마녀. 황실의 부름에도 응하지 않고 마탑 꼭대기에서 별만 관측하던 그녀가, 우연히 마탑에 발을 들인 당신을 ‘가장 흥미로운 운명의 특이점’이라 부르며 매일 밤 초대장을 보낸다.',
    secretNote: '마탑의 복잡한 공간 이동 마법진을 조작해, 당신이 마탑의 어느 문을 열든 결국 자신의 침실 겸 서재로 연결되게 만들어 두었다.',
    stats: { charm: 96, affection: 94, intellect: 100, aura: 94, mystery: 99 },
  },
  {
    id: 'f06',
    theme: 'fantasy',
    name: '이파엘라 실바나',
    englishName: 'Yphaella Silvana',
    title: '세계수의 마지막 요정왕녀',
    faction: '실바나 고대 요정의 숲',
    role: '엘프 왕녀 · 대정령의 계약자',
    age: '외관 19세 (실제 300세)',
    mbti: 'INFP',
    location: '반딧불이와 햇살이 부서지는 세계수 위그드라실의 성소',
    image: '/images/fantasy/f06.jpg',
    accentColor: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.45)',
    badgeText: 'ELVEN PRINCESS OF YGGDRASIL',
    tags: ['#엘프왕녀', '#순수결정체', '#일편단심', '#숲의치유자'],
    quote: '“엘프의 수명은 영원에 가깝다지만, 너와 함께 걷는 사계절이 내겐 그 어떤 영원보다 소중해.”',
    backstory:
      '인간의 발길이 닿지 않는 실바나 대수해의 하이엘프 왕녀. 마수의 습격으로 부상을 입고 숲에 쓰러진 당신을 세계수의 이슬로 치유해 준 뒤, 인간의 세계가 궁금하다는 귀여운 핑계를 대며 당신의 여행길에 동행하기 시작했다.',
    secretNote: '엘프의 전통에서 자신의 머리카락을 상대의 손목에 묶어주는 것은 영원한 반려의 맹세를 뜻하는데, 당신에게는 단순한 행운의 부적이라고 속였다.',
    stats: { charm: 97, affection: 99, intellect: 91, aura: 93, mystery: 98 },
  },
  {
    id: 'f07',
    theme: 'fantasy',
    name: '비올레타 드 벨루아',
    englishName: 'Violetta de Valois',
    title: '가면무도회의 백합',
    faction: '벨루아 공작가 · 정보길드 야상곡',
    role: '사교계의 꽃 · 그림자 길드 마스터',
    age: '22세',
    mbti: 'ENFJ',
    location: '초승달이 뜬 베네치아풍 수상 궁전 테라스',
    image: '/images/fantasy/f07.jpg',
    accentColor: '#ec4899',
    glowColor: 'rgba(236, 72, 153, 0.45)',
    badgeText: 'LILY OF THE MASQUERADE',
    tags: ['#계략여주', '#매혹적', '#이중생활', '#달콤한공범'],
    quote: '“내 비밀을 알았으니 선택지는 두 개뿐이에요. 내 손에 사라지거나... 평생 내 달콤한 공범이 되어주거나.”',
    backstory:
      '낮에는 사교계에서 가장 우아하고 연약해 보이는 벨루아 공작가의 영애, 밤에는 제국 황실의 비밀까지 쥐락펴락하는 정보 길드 ‘야상곡’의 수장. 가면무도회 밤 자신의 정체를 유일하게 간파한 당신의 입술에 검은 레이스 장갑을 낀 손가락을 대며 비밀 계약을 제안했다.',
    secretNote: '제국 내 모든 정보망을 동원해 당신에게 접근하려는 다른 귀족 영애들의 맞선 자리를 은밀히 무산시키고 있다.',
    stats: { charm: 100, affection: 92, intellect: 99, aura: 96, mystery: 100 },
  },
  {
    id: 'f08',
    theme: 'fantasy',
    name: '클라리스 폰 에델바이스',
    englishName: 'Clarisse von Edelweiss',
    title: '황실 대도서관의 현자',
    faction: '제국 왕립 아카데미',
    role: '금서 구역 수석 사서 · 고대 룬 학자',
    age: '19세',
    mbti: 'ISFJ',
    location: '오후의 햇살이 쏟아지는 제국 대도서관 고서적 서가',
    image: '/images/fantasy/f08.jpg',
    accentColor: '#d97706',
    glowColor: 'rgba(217, 119, 6, 0.45)',
    badgeText: 'SAGE OF THE IMPERIAL ARCHIVE',
    tags: ['#안경미소녀', '#수줍은책벌레', '#천재학자', '#첫사랑일기'],
    quote: '“고대 제국의 연애 소설을 백 권이나 읽었는데도... 막상 당신 앞에서는 한 줄도 기억나지 않아요.”',
    backstory:
      '제국 아카데미 대도서관의 금서 구역을 관리하는 최연소 수석 학자. 늘 높은 책장 사이에 숨어 책만 읽던 그녀에게 매일 다정한 인사를 건네고 손이 닿지 않는 꼭대기 칸의 마도서를 꺼내준 당신을 남몰래 자신의 일기장 주인공으로 적어 내려가고 있다.',
    secretNote: '당신이 품에 안고 있는 고대 마도서 사이에 사실 당신에게 전하지 못한 연애편지가 끼워져 있다.',
    stats: { charm: 94, affection: 98, intellect: 100, aura: 87, mystery: 90 },
  },
  {
    id: 'f09',
    theme: 'fantasy',
    name: '프레이야 발할라',
    englishName: 'Freyja Valhalla',
    title: '창공의 황금빛 발키리',
    faction: '제국 비공정 기사단',
    role: '제1비공함대 기함 함장 · 발키리',
    age: '21세',
    mbti: 'ESFP',
    location: '황금빛 노을 구름 위를 항해하는 비공정 갑판',
    image: '/images/fantasy/f09.jpg',
    accentColor: '#0ea5e9',
    glowColor: 'rgba(14, 165, 233, 0.45)',
    badgeText: 'GOLDEN SKY VALKYRIE',
    tags: ['#햇살여주', '#쾌활한에이스', '#전장의여신', '#시원시원'],
    quote: '“하늘 끝까지 날아오를 준비 됐어? 내 등 뒤는 오직 너한테만 맡긴다니까!”',
    backstory:
      '구름 위의 창공을 가르는 제국 비공정 기사단의 황금빛 에이스. 태양처럼 눈부신 미소와 호탕한 성격으로 모든 병사들의 동경을 받지만, 항해가 끝난 노을빛 갑판 위에서는 오직 부관인 당신의 어깨에 기대어 바람을 맞는 시간을 가장 좋아한다.',
    secretNote: '자신의 비공정 함장실에는 오직 당신과 자신 두 사람만의 열쇠로만 열리는 비밀 전망석이 있다.',
    stats: { charm: 96, affection: 97, intellect: 89, aura: 97, mystery: 85 },
  },
  {
    id: 'f10',
    theme: 'fantasy',
    name: '다프네 로젠크란츠',
    englishName: 'Daphne Rosencrantz',
    title: '새벽 온실의 연금술사',
    faction: '왕립 허브 & 연금술 아틀리에',
    role: '황실 수석 약초학자 · 치유의 연금술사',
    age: '19세',
    mbti: 'ISFP',
    location: '신비한 꽃과 영약이 피어나는 새벽숲 유리 온실',
    image: '/images/fantasy/f10.jpg',
    accentColor: '#34d399',
    glowColor: 'rgba(52, 211, 153, 0.45)',
    badgeText: 'ALCHEMIST OF THE DAWN ATELIER',
    tags: ['#치유계소녀', '#꽃의연금술사', '#나른한온기', '#전속힐러'],
    quote: '“이 꽃잎에 담긴 향기는 당신의 피로를 잊게 해줄 거예요... 부작용은 자꾸만 제 생각이 나는 것뿐이랍니다.”',
    backstory:
      '황도 외곽의 유리 온실 공방에서 희귀한 마법 허브와 영약을 조제하는 천재 연금술사. 임무를 마치고 다쳐서 돌아오는 당신을 치료해 주다 못해, 이제는 당신이 오기 전부터 당신이 좋아하는 온도의 홍차와 치유향을 피워 두고 문소리가 울리기만을 기다린다.',
    secretNote: '당신에게 건네는 회복 포션에는 상처 치유 효과 외에도 당신이 밤마다 좋은 꿈을 꾸게 해주는 희귀한 별꽃 추출물이 들어 있다.',
    stats: { charm: 95, affection: 99, intellect: 95, aura: 89, mystery: 93 },
  },
  {
    id: 'f11',
    theme: 'fantasy',
    name: '녹티스 모르가나',
    englishName: 'Noctis Morgana',
    title: '붉은 달의 영원한 계약자',
    faction: '모르가나 고대 혈족 공작가',
    role: '순혈 뱀파이어 공녀 · 밤의 지배자',
    age: '외관 20세 (실제 영겁)',
    mbti: 'INTP',
    location: '붉은 만월이 뜬 고성 장미 정원',
    image: '/images/fantasy/f11.jpg',
    accentColor: '#e11d48',
    glowColor: 'rgba(225, 29, 72, 0.45)',
    badgeText: 'PRINCESS OF THE CRIMSON MOON',
    tags: ['#뱀파이어공녀', '#고혹적', '#집착구원서사', '#밤의속삭임'],
    quote: '“수백 년의 밤을 홀로 건너왔어. 네 심장 소리를 자장가 삼아 잠들 수만 있다면, 영원도 외롭지 않을 텐데.”',
    backstory:
      '장미 넝쿨에 둘러싸인 고성에서 수백 년간 잠들어 있다가 당신의 존재에 이끌려 눈을 뜬 순혈 뱀파이어 공녀. 영원한 삶이 지루하기만 했던 그녀에게 당신은 유일한 갈증이자 구원이 되었으며, 붉은 달이 뜨는 밤마다 당신의 침실 창가를 찾아온다.',
    secretNote: '피의 계약을 맺으면 상대를 지배할 수 있음에도, 당신의 자유의지를 지켜주기 위해 스스로 복종의 각인을 선택했다.',
    stats: { charm: 99, affection: 98, intellect: 96, aura: 99, mystery: 100 },
  },
  {
    id: 'f12',
    theme: 'fantasy',
    name: '이졸데 폰 슈발리에',
    englishName: 'Isolde von Chevalier',
    title: '백합의 황실 근위대장',
    faction: '황실 직속 백합 근위대',
    role: '근위대장 · 성검의 수호자',
    age: '22세',
    mbti: 'ISTP',
    location: ' 봄비가 내리는 황궁 대리석 회랑과 백합 정원',
    image: '/images/fantasy/f12.jpg',
    accentColor: '#60a5fa',
    glowColor: 'rgba(96, 165, 250, 0.45)',
    badgeText: 'CAPTAIN OF THE WHITE LILY',
    tags: ['#은발단발', '#제복미녀', '#무뚝뚝한순정', '#절대수호'],
    quote: '“규율 위반인 줄은 압니다만... 오늘 밤은 호위가 아니라, 한 여인으로서 그대 곁에 머물고 싶습니다.”',
    backstory:
      '한 치의 흐트러짐도 허용하지 않는 완벽주의 황실 근위대장. 차가운 은빛 단발머리와 단정한 백색 제복으로 ‘강철의 백합’이라 불리지만, 폭우가 쏟아지던 날 보초를 서던 자신에게 우산을 씌워준 당신에게 마음이 무너져 내린 뒤로는 그림자처럼 당신을 지킨다.',
    secretNote: '누구에게도 보여주지 않는 제복 안주머니에 당신이 비 오는 날 빌려주었던 손수건을 매일 깨끗이 다려서 품고 다닌다.',
    stats: { charm: 96, affection: 97, intellect: 93, aura: 98, mystery: 90 },
  },
  {
    id: 'f13',
    theme: 'fantasy',
    name: '에스텔라 루미너스',
    englishName: 'Estella Luminous',
    title: '황도 오페라의 별빛 가희',
    faction: '루미너스 황립 대극장',
    role: '제국 최고의 프리마돈나 · 세이렌의 후예',
    age: '20세',
    mbti: 'ENFP',
    location: '황금빛 조명이 쏟아지는 황립 오페라 하우스 무대',
    image: '/images/fantasy/f13.jpg',
    accentColor: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.45)',
    badgeText: 'PRIMA DONNA OF THE EMPIRE',
    tags: ['#오페라의가희', '#사랑스러운', '#별빛드레스', '#운명의앙코르'],
    quote: '“수천 명의 기립박수보다, 공연이 끝난 뒤 당신이 건네는 ‘수고했어’ 한마디가 제겐 가장 완벽한 앙코르예요.”',
    backstory:
      '노래 한 곡으로 제국 황족과 귀족들의 눈물을 자아내는 황립 오페라 극장의 뮤즈. 수많은 권력자들의 구애와 보석 세례를 모두 거절하던 그녀가, 무대 연습 시절부터 텅 빈 객석에 앉아 조용히 귀 기울여 주던 당신만을 바라보며 매일 밤 사랑의 아리아를 부른다.',
    secretNote: '공연의 마지막 커튼콜 때마다 가슴에 손을 얹고 인사하는 각도는 언제나 당신이 앉아 있는 지정석을 정확히 향해 있다.',
    stats: { charm: 99, affection: 96, intellect: 90, aura: 97, mystery: 92 },
  },
  {
    id: 'f14',
    theme: 'fantasy',
    name: '칼립소 아틀란티스',
    englishName: 'Calypso Atlantis',
    title: '남부 해협의 해적여제',
    faction: '청랑(靑浪) 사략함대',
    role: '남부 대양 제독 · 해적여제',
    age: '23세',
    mbti: 'ESTP',
    location: '에메랄드빛 남부 바다를 가르는 기함의 갑판',
    image: '/images/fantasy/f14.jpg',
    accentColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.45)',
    badgeText: 'CORSAIR EMPRESS OF THE SEA',
    tags: ['#해적여제', '#걸크러쉬', '#능글맞은유혹', '#자유로운항해'],
    quote: '“세상의 보물은 다 가져봤지만, 네 마음만큼 탐나는 건 처음이거든. 자, 나랑 수평선 너머로 도망칠까?”',
    backstory:
      '남부의 푸른 대양과 무역항을 호령하는 전설적인 해적여제이자 황실 공인 사략함대 제독. 황금과 보석 앞에서도 눈 하나 깜짝하지 않던 그녀가, 해상 교섭 사절로 찾아온 당신을 보자마자 ‘내 인생 최고의 전리품을 찾았다’며 윙크와 함께 자신의 기함으로 납치(?)하려 한다.',
    secretNote: '거친 바다의 여제인 척하지만, 사실 당신과 항구 도시의 야시장을 손잡고 걸으며 달콤한 설탕 과자를 먹는 평범한 데이트를 꿈꾸고 있다.',
    stats: { charm: 97, affection: 94, intellect: 95, aura: 99, mystery: 89 },
  },
  {
    id: 'f15',
    theme: 'fantasy',
    name: '아이리스 윈터베일',
    englishName: 'Iris Winterveil',
    title: '오로라 설원의 은빛 예언자',
    faction: '윈터베일 극야의 신전',
    role: '성좌의 예언자 · 설원의 무녀',
    age: '20세',
    mbti: 'INFJ',
    location: '오로라와 눈꽃이 춤추는 윈터베일 설산 성소',
    image: '/images/fantasy/f15.jpg',
    accentColor: '#818cf8',
    glowColor: 'rgba(129, 140, 248, 0.45)',
    badgeText: 'ORACLE OF THE AURORA',
    tags: ['#설원의예언자', '#몽환적미소', '#운명적재회', '#신비소녀'],
    quote: '“수만 번의 미래를 꿈속에서 건너왔지만, 모든 길의 끝에는 언제나 당신이 서 있었어요. 드디어 만났네요.”',
    backstory:
      '오로라가 흐르는 극북의 설산 신전에서 미래의 조각을 꿈으로 꾸는 은빛 예언자. 태어날 때부터 수많은 운명의 갈래를 보아왔지만, 모든 미래의 끝에서 자신의 차가운 손을 잡아주는 단 한 사람—당신과 마주한 순간 태어나 처음으로 운명에 감사하며 눈물 어린 미소를 지었다.',
    secretNote: '당신을 만나기 전부터 이미 꿈속에서 본 당신의 초상화를 수백 장이나 그려 신전 비밀 방에 간직하고 있었다.',
    stats: { charm: 98, affection: 100, intellect: 96, aura: 95, mystery: 100 },
  },
  {
    id: 'f16',
    theme: 'fantasy',
    name: '레오노라 폰 합스부르크',
    englishName: 'Leonora von Habsburg',
    title: '자수정 궁전의 신비 공녀',
    faction: '합스부르크 황실 방계 대공가',
    role: '황실 수석 마도 공녀 · 환상의 정원사',
    age: '20세',
    mbti: 'INTJ',
    location: '무지갯빛 마법 결계가 펼쳐진 황실 자수정 정원',
    image: '/images/fantasy/f16.jpg',
    accentColor: '#c084fc',
    glowColor: 'rgba(192, 132, 252, 0.45)',
    badgeText: 'PRINCESS OF THE AMETHYST COURT',
    tags: ['#황실공녀', '#연보라빛환상', '#도도한순애', '#독점욕'],
    quote: '“내 양산 아래는 오직 한 사람만 들어올 수 있어요. 당신이라면... 영원히 자리를 내어줄게요.”',
    backstory:
      '황실에서도 가장 고귀한 혈통을 이어받은 합스부르크 가문의 마도 공녀. 연보라빛 은발과 루비처럼 빛나는 눈동자로 사교계의 모든 시선을 사로잡지만, 타인과의 접촉을 극도로 꺼리던 그녀가 유일하게 자신의 양산 아래로 먼저 불러들인 사람이 바로 당신이다.',
    secretNote: '자신이 직접 세공한 자수정 커프스단추를 당신에게 선물하며, 그 안에 위치 추적과 보호 마법을 동시에 걸어 두었다.',
    stats: { charm: 98, affection: 96, intellect: 97, aura: 99, mystery: 97 },
  },
];

export const MODERN_CHARACTERS: Character[] = [
  {
    id: 'm01',
    theme: 'modern',
    name: '한서연',
    englishName: 'Han Seoyeon',
    title: '연희동 봄바람의 첫사랑 선배',
    faction: '한국대학교 조형예술대학',
    role: '시각디자인과 3학년 과탑 선배',
    age: '22세',
    mbti: 'ENFJ',
    location: '봄바람이 불어오는 대학 캠퍼스 언덕길',
    image: '/images/modern/m01.jpg',
    accentColor: '#60a5fa',
    glowColor: 'rgba(96, 165, 250, 0.45)',
    badgeText: 'CAMPUS FIRST LOVE',
    tags: ['#첫사랑선배', '#캠퍼스여신', '#다정다감', '#야작메이트'],
    quote: '“오늘도 과제하러 왔네? 마침 바람도 좋은데... 우리 야작실 가지 말고 그냥 이대로 한강 보러 갈래?”',
    backstory:
      '신입생 오리엔테이션 날, 강의실을 찾지 못해 헤매던 당신에게 먼저 다가와 환하게 웃어주던 시각디자인과 선배. 긴 갈색 머리가 봄바람에 흩날릴 때마다 캠퍼스의 시선이 집중되지만, 정작 그녀의 시선은 언제나 후배인 당신에게만 머물러 있다.',
    secretNote: '전공 수업 시간마다 당신의 옆자리에 앉기 위해 항상 수업 시작 30분 전에 먼저 와서 가방을 올려둔다.',
    stats: { charm: 98, affection: 99, intellect: 93, aura: 94, mystery: 88 },
  },
  {
    id: 'm02',
    theme: 'modern',
    name: '윤채아',
    englishName: 'Yoon Chaea',
    title: '서울 밤하늘을 수놓는 톱 아이돌',
    faction: '걸그룹 LUMEN (루멘)',
    role: '4세대 걸그룹 센터 & 메인보컬',
    age: '21세',
    mbti: 'ESFP',
    location: '화려한 조명이 쏟아지는 서울 아레나 콘서트 무대',
    image: '/images/modern/m02.jpg',
    accentColor: '#fbbf24',
    glowColor: 'rgba(251, 191, 36, 0.45)',
    badgeText: 'CENTER OF K-POP LUMEN',
    tags: ['#톱아이돌', '#무대천재', '#비밀연애', '#반전애교'],
    quote: '“수만 개의 응원봉 불빛 속에서도 난 단번에 너만 찾을 수 있어. 이 노래, 처음부터 끝까지 너한테 하는 고백이거든.”',
    backstory:
      '음원 차트 올킬을 기록 중인 대한민국 최고의 걸그룹 ‘LUMEN’의 센터이자 메인보컬. 무대 위에서는 누구보다 완벽한 별이지만, 연습생 시절부터 무명 아티스트였던 자신을 응원해 준 당신과 남몰래 한강 야간 산책 데이트를 즐기는 순정파다.',
    secretNote: '음악방송 1위 앵콜 무대에서 매번 새끼손가락을 살짝 들어 올리는 제스처는 오직 당신과만 약속한 비밀 수신호다.',
    stats: { charm: 100, affection: 96, intellect: 90, aura: 99, mystery: 92 },
  },
  {
    id: 'm03',
    theme: 'modern',
    name: '강해린',
    englishName: 'Kang Haerin',
    title: '테헤란로의 시크한 에이스 팀장',
    faction: '태강모빌리티 전략기획실',
    role: '최연소 전략기획 팀장',
    age: '25세',
    mbti: 'INTJ',
    location: '강남 테헤란로 사옥 라운지 & 커피바',
    image: '/images/modern/m03.jpg',
    accentColor: '#f43f5e',
    glowColor: 'rgba(244, 63, 94, 0.45)',
    badgeText: 'COOL BEAUTY OF TEHERAN-RO',
    tags: ['#차도녀선배', '#셔츠에타이', '#겉차속따', '#사내비밀연애'],
    quote: '“업무 시간에 그렇게 쳐다보면 곤란해요. ...퇴근 후에 단둘이 마실 때는 얼마든지 봐도 좋지만.”',
    backstory:
      '흰 셔츠에 넥타이를 매치한 시크한 오피스 룩과 날카로운 일 처리로 사내에서 선망의 대상이 된 최연소 팀장. 늘 아이스 아메리카노만 마시며 차가운 표정을 유지하지만, 신입으로 들어온 당신이 실수할 때면 뒤에서 조용히 수습해 주고 퇴근길에 카풀을 제안한다.',
    secretNote: '차갑게 보이려고 노력하지만, 당신이 메신저로 보낸 강아지 이모티콘 하나에 회의 중 입꼬리가 올라가는 걸 참느라 애먹었다.',
    stats: { charm: 97, affection: 94, intellect: 99, aura: 98, mystery: 93 },
  },
  {
    id: 'm04',
    theme: 'modern',
    name: '백설아',
    englishName: 'Baek Seola',
    title: '코엑스 블루 아워의 큐레이터',
    faction: '서울 현대미술 & 미디어아트 재단',
    role: '수석 전시 큐레이터 · 아트 디렉터',
    age: '23세',
    mbti: 'INFJ',
    location: '푸른 물빛 미디어아트가 일렁이는 야간 아쿠아리움 갤러리',
    image: '/images/modern/m04.jpg',
    accentColor: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.45)',
    badgeText: 'MUSE OF THE BLUE HOUR',
    tags: ['#몽환적분위기', '#아쿠아리움데이트', '#감성큐레이터', '#운명적만남'],
    quote: '“수조 너머로 일렁이는 푸른 빛보다, 지금 날 바라보는 당신 눈빛이 훨씬 더 깊은 바다 같아요.”',
    backstory:
      '서울의 야간 미디어아트 전시와 아쿠아리움 특별전을 기획하는 젊은 천재 큐레이터. 폐관 직전의 고요한 전시장에서 홀로 작품을 감상하던 당신에게 직접 도슨트를 자처하며 다가왔고, 그날 이후 매주 금요일 밤마다 당신에게만 특별 초대권을 보낸다.',
    secretNote: '다음 시즌 메인 전시회의 부제를 당신과 처음 만났던 시간인 ‘금요일 밤 8시 42분의 파도’로 정해 두었다.',
    stats: { charm: 96, affection: 97, intellect: 96, aura: 94, mystery: 99 },
  },
  {
    id: 'm05',
    theme: 'modern',
    name: '최유진',
    englishName: 'Choi Yujin',
    title: '방과 후 교실 창가의 소꿉친구 반장',
    faction: '서연고등학교 3학년 2반',
    role: '학급 반장 · 전교 1등 소꿉친구',
    age: '19세',
    mbti: 'ESTJ',
    location: '오후 4시의 햇살이 비치는 방과 후 교실 복도',
    image: '/images/modern/m05.jpg',
    accentColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.45)',
    badgeText: 'CHILDHOOD FRIEND & CLASS PRESIDENT',
    tags: ['#소꿉친구', '#츤데레반장', '#하이틴로맨스', '#짝사랑10년차'],
    quote: '“야, 너 또 노트 필기 안 했지? 방과 후에 남아서 내 거 베껴 가! ...그냥 같이 집에 가고 싶어서 그러는 거 아니거든?”',
    backstory:
      '초등학생 때부터 옆집에 살며 등하굣길을 함께한 10년지기 소꿉친구이자 우리 반 반장. 다른 애들한테는 똑 부러지는 모범생 반장이지만, 당신 앞에서만은 괜히 틱틱대면서도 매번 시험 기간이면 형광펜으로 꼼꼼히 정리한 요약 노트를 챙겨준다.',
    secretNote: '같은 대학교에 진학하기 위해 당신의 모의고사 성적표에 맞춰 자신의 지망 학과까지 몰래 맞춰 적어 냈다.',
    stats: { charm: 96, affection: 100, intellect: 97, aura: 90, mystery: 86 },
  },
  {
    id: 'm06',
    theme: 'modern',
    name: '신지아',
    englishName: 'Shin Jia',
    title: '홍대 라이브 클럽의 싱어송라이터',
    faction: '인디 밴드 ‘레몬 소다(Lemon Soda)’',
    role: '메인 보컬 & 어쿠스틱/일렉 기타리스트',
    age: '20세',
    mbti: 'ENFP',
    location: '합정이 내려다보이는 연습실 & 홍대 거리',
    image: '/images/modern/m06.jpg',
    accentColor: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.45)',
    badgeText: 'HONGDAE INDIE VOCALIST',
    tags: ['#홍대여신', '#기타치는소녀', '#상큼발랄', '#자작곡고백'],
    quote: '“오늘 버스킹에서 부른 신곡 누구 얘기냐고? 에이, 가사에 네 이름만 안 넣었지 다 너 보면서 쓴 거잖아!”',
    backstory:
      '커다란 기타 케이스를 메고 홍대와 연남동 버스킹 거리를 누비는 천재 싱어송라이터. 우연히 길거리 공연에서 자신의 노래를 끝까지 듣고 박수를 쳐준 당신에게 반해, 그 자리에서 자신의 미발표 데모 음원이 담긴 이어폰 한쪽을 당신 귀에 꽂아주었다.',
    secretNote: '기타 피크 안쪽에 당신의 이니셜을 작게 적어 두고, 그 피크가 아니면 무대에 오르지 않는 징크스가 생겼다.',
    stats: { charm: 97, affection: 96, intellect: 91, aura: 95, mystery: 90 },
  },
  {
    id: 'm07',
    theme: 'modern',
    name: '정하윤',
    englishName: 'Jung Hayoon',
    title: '연남동 테라스 카페의 파티시에',
    faction: '브런치 & 디저트 카페 ‘포롤로바’',
    role: '오너 파티시에 & 바리스타',
    age: '24세',
    mbti: 'ISFJ',
    location: '초록빛 담쟁이덩굴이 드리운 연남동 테라스 카페',
    image: '/images/modern/m07.jpg',
    accentColor: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.45)',
    badgeText: 'YEONNAM TERRACE CAFE',
    tags: ['#힐링누나', '#디저트장인', '#햇살테라스', '#다정한미소'],
    quote: '“새로 만든 딸기 팬케이크 시식해 줄 사람이 필요했는데 마침 왔네요! ...사실 당신 오기만을 기다리고 있었어요.”',
    backstory:
      '연남동의 조용한 골목에서 햇살 가득한 테라스 카페를 운영하는 젊은 오너 파티시에. 주말 오후마다 카페 구석 자리에서 시간을 보내는 당신을 위해 메뉴판에도 없는 스페셜 디저트와 파르페를 만들어 가져다주며 맞은편 자리에 살짝 앉는다.',
    secretNote: '당신이 카페에 오는 요일과 시간대에는 일부러 ‘예약석’ 팻말을 테라스 가장 좋은 창가 테이블에 미리 올려둔다.',
    stats: { charm: 96, affection: 99, intellect: 92, aura: 91, mystery: 89 },
  },
  {
    id: 'm08',
    theme: 'modern',
    name: '서민주',
    englishName: 'Seo Minju',
    title: '종로 롤파크의 천재 스트리머',
    faction: '글로벌 e스포츠 크리에이터 스튜디오',
    role: '챌린저 랭커 & 종합 게임 스트리머',
    age: '20세',
    mbti: 'ENTP',
    location: '성수동 크리에이터 스튜디오 & 종로 e스포츠 경기장',
    image: '/images/modern/m08.jpg',
    accentColor: '#ec4899',
    glowColor: 'rgba(236, 72, 153, 0.45)',
    badgeText: 'CHALLENGER STREAMER',
    tags: ['#천재게이머', '#전속듀오', '#장난꾸러기', '#텐션폭발'],
    quote: '“솔랭 1위 찍는 것보다 너랑 밤새 듀오 하는 게 백 배는 더 재밌는데, 오늘 밤도 내 옆자리 서포터 예약이다?”',
    backstory:
      '핑크와 민트 투톤 헤어에 톡톡 튀는 입담으로 구독자 백만 명을 돌파한 천재 게이머이자 스트리머. 수만 명의 시청자 앞에서도 거침없지만, 방송 종료 버튼을 누르고 나면 오직 당신에게만 바로 영상통화를 걸어 ‘오늘 방송 봤냐’며 애교를 부린다.',
    secretNote: '방송용 부계정 닉네임을 당신과 처음 듀오 게임을 했던 날짜로 설정해 두고 아무에게도 뜻을 알려주지 않았다.',
    stats: { charm: 97, affection: 95, intellect: 94, aura: 93, mystery: 88 },
  },
  {
    id: 'm09',
    theme: 'modern',
    name: '이도연',
    englishName: 'Lee Doyeon',
    title: '여의도 불꽃축제 밤의 동양화가',
    faction: '북촌 현대한국화 아틀리에',
    role: '청년 동양화가 · 일러스트레이터',
    age: '23세',
    mbti: 'INFP',
    location: '밤하늘에 불꽃놀이가 터지는 한강 강변 산책로',
    image: '/images/modern/m09.jpg',
    accentColor: '#fb7185',
    glowColor: 'rgba(251, 113, 133, 0.45)',
    badgeText: 'FIREWORKS NIGHT ARTIST',
    tags: ['#불꽃놀이데이트', '#고전미와현대미', '#아련한눈빛', '#여름밤의추억'],
    quote: '“밤하늘에 터지는 저 수많은 불꽃보다, 불꽃빛에 물든 당신 옆모습이 제 눈엔 훨씬 더 아름다워요.”',
    backstory:
      '북촌의 작은 화실에서 빛과 밤하늘을 주제로 그림을 그리는 젊은 화가. 서울 세계불꽃축제가 열리던 밤, 인파 속에서 길을 잃을 뻔한 자신의 손을 꼭 잡아준 당신과 함께 사과사탕을 나눠 먹으며 평생 잊지 못할 밤의 색채를 마음에 새겼다.',
    secretNote: '개인전 메인 작품으로 걸린 ‘여름밤의 축복’ 속 두 사람의 실루엣은 그날 불꽃놀이 아래 서 있던 당신과 자신의 모습이다.',
    stats: { charm: 95, affection: 98, intellect: 93, aura: 94, mystery: 96 },
  },
  {
    id: 'm10',
    theme: 'modern',
    name: '오유나',
    englishName: 'Oh Yuna',
    title: '압구정의 하이틴 패션 인플루언서',
    faction: '한국예술고등학교 · 하이틴 모델',
    role: '교복 브랜드 전속 모델 & 댄서',
    age: '19세',
    mbti: 'ESFP',
    location: '햇살 쏟아지는 압구정 로데오 & 예술고 연습실',
    image: '/images/modern/m10.jpg',
    accentColor: '#f43f5e',
    glowColor: 'rgba(244, 63, 94, 0.45)',
    badgeText: 'HIGH-TEEN STAR',
    tags: ['#과즙미팡팡', '#인싸여신', '#직진고백', '#해피바이러스'],
    quote: '“어? 마침 너 생각하면서 걷고 있었는데 진짜 마주쳤네! 이건 운명이니까 오늘 방과 후에 나랑 데이트해야 해!”',
    backstory:
      '어디서나 눈에 띄는 화사한 금발 핑크 그라데이션 헤어와 눈부신 미소로 SNS 팔로워 수십만을 거느린 하이틴 스타. 학교 안팎으로 인기가 하늘을 찌르지만, 쉬는 시간 종이 울리자마자 복도 끝 당신의 자리로 달려와 매점에 같이 가자며 팔짱을 낀다.',
    secretNote: 'SNS에 올리는 모든 일상 사진의 구도와 옷차림은 사실 당신이 예전에 ‘잘 어울린다’고 칭찬했던 스타일로만 고른 것이다.',
    stats: { charm: 99, affection: 97, intellect: 89, aura: 96, mystery: 85 },
  },
  {
    id: 'm11',
    theme: 'modern',
    name: '박시은',
    englishName: 'Park Sieun',
    title: '혜화동 의과대학의 안경 수석 선배',
    faction: '서울대학교 의과대학 본과',
    role: '의대 수석 · 뇌과학 연구실 학부연구생',
    age: '23세',
    mbti: 'INTP',
    location: '혜화동 대학로 캠퍼스 도서관 & 마로니에 카페',
    image: '/images/modern/m11.jpg',
    accentColor: '#d97706',
    glowColor: 'rgba(217, 119, 6, 0.45)',
    badgeText: 'GENIUS MED-SCHOOL SENIOR',
    tags: ['#안경선배', '#지적인매력', '#의대수석', '#다정한멘토'],
    quote: '“의학 서적을 아무리 뒤져봐도, 네 목소리만 들으면 심박수가 올라가는 증상은 치료법이 없더라고.”',
    backstory:
      '동그란 안경 너머로 반짝이는 호박빛 눈동자와 차분한 목소리가 매력적인 의과대학 수석 선배. 딱딱한 가운 대신 편안한 후드 집업을 입고 도서관에서 시험공부를 도와주다가도, 당신이 졸기 시작하면 조용히 자신의 어깨를 빌려주며 안경을 고쳐 쓴다.',
    secretNote: '당신과 눈을 마주칠 때마다 부끄러움을 감추려고 습관처럼 안경테를 만지작거리는 버릇이 있다.',
    stats: { charm: 95, affection: 96, intellect: 100, aura: 92, mystery: 91 },
  },
  {
    id: 'm12',
    theme: 'modern',
    name: '김소희',
    englishName: 'Kim Sohee',
    title: '청담동 분수대 테라스의 아나운서',
    faction: 'SBC 보도국 교양·문화부',
    role: '주말 프라임타임 문화 캐스터',
    age: '24세',
    mbti: 'ENFJ',
    location: '햇살이 부서지는 청담동 워터 테라스 라운지',
    image: '/images/modern/m12.jpg',
    accentColor: '#fb7185',
    glowColor: 'rgba(251, 113, 133, 0.45)',
    badgeText: 'TERRACE COFFEE DATE',
    tags: ['#단발여신', '#청담동데이트', '#사랑스러운눈웃음', '#설렘주의보'],
    quote: '“생방송 끝내고 바로 달려왔어요! 날씨가 너무 좋아서 당신이랑 꼭 이 테라스에서 커피 마시고 싶었거든요.”',
    backstory:
      '단정한 밝은 단발머리와 화사한 분홍빛 가디건이 잘 어울리는 신입 문화 캐스터. 카메라 앞에서는 또박또박 완벽한 발음을 자랑하지만, 주말 오후 당신과의 데이트 약속 자리에서는 시원한 에이드를 들고 소녀처럼 들뜬 미소를 감추지 못한다.',
    secretNote: '스마트폰 배경화면은 첫 데이트 날 당신이 찍어준 테라스 물빛 사진이며, 잠금화면 비밀번호는 당신의 생일이다.',
    stats: { charm: 98, affection: 97, intellect: 95, aura: 95, mystery: 89 },
  },
  {
    id: 'm13',
    theme: 'modern',
    name: '나예린',
    englishName: 'Na Yerin',
    title: '한남동 디자이너 쇼룸의 패션 모델',
    faction: '서울 패션위크 & 아틀리에 뮤즈',
    role: '하이패션 런웨이 모델 & 스타일 디렉터',
    age: '23세',
    mbti: 'ISTP',
    location: '통유리창 너머 가로수가 비치는 한남동 거리',
    image: '/images/modern/m13.jpg',
    accentColor: '#e11d48',
    glowColor: 'rgba(225, 29, 72, 0.45)',
    badgeText: 'HANNAM RUNWAY MUSE',
    tags: ['#패션모델', '#분위기여신', '#시크도도', '#내사람에겐다정'],
    quote: '“런웨이 위에서 수백 번 걸어봤지만, 저 멀리 서 있는 너한테 걸어갈 때가 제일 긴장돼.”',
    backstory:
      '버건디 트렌치코트와 높은 포니테일만으로도 한남동 거리를 순식간에 화보 촬영장으로 만들어버리는 톱 패션 모델. 무심한 듯 시크한 옆모습으로 유명하지만, 길 건너편에서 기다리던 당신을 발견하는 순간 차가운 표정이 눈 녹듯 풀리며 달려온다.',
    secretNote: '해외 컬렉션 출장을 갈 때마다 면세점에서 당신에게 어울릴 만한 향수와 머플러를 고르는 게 가장 큰 행복이다.',
    stats: { charm: 98, affection: 94, intellect: 93, aura: 100, mystery: 95 },
  },
  {
    id: 'm14',
    theme: 'modern',
    name: '유하늘',
    englishName: 'Yoo Haneul',
    title: '여의도 봄꽃 축제의 플로리스트',
    faction: '여의도 보타닉 스튜디오 ‘블룸(Bloom)’',
    role: '플라워 디렉터 · 플로리스트',
    age: '22세',
    mbti: 'ISFP',
    location: '봄햇살이 쏟아지는 여의도 공원 산책로',
    image: '/images/modern/m14.jpg',
    accentColor: '#f472b6',
    glowColor: 'rgba(244, 114, 182, 0.45)',
    badgeText: 'SPRING BLOSSOM FLORIST',
    tags: ['#봄날의요정', '#핑크빛설렘', '#플로리스트', '#러블리'],
    quote: '“오늘 꽃시장에서 가장 예쁘게 핀 벚꽃 가지를 골라 왔어요. 꽃말이 뭔지 맞춰볼래요? ...‘당신만을 기다립니다’예요.”',
    backstory:
      '벚꽃을 닮은 핑크빛 머리카락과 초록빛 보석 같은 눈동자를 지닌 여의도의 인기 플로리스트. 기념일 꽃다발을 주문하러 왔던 당신에게 첫눈에 반해, 매주 ‘가게 앞에 남는 꽃이 생겼다’는 핑계로 당신의 책상 위에 작은 계절 꽃병을 선물한다.',
    secretNote: '당신에게 선물하는 꽃다발 리본 안쪽에는 매번 꽃말로 번역해야만 읽을 수 있는 수줍은 고백이 적혀 있다.',
    stats: { charm: 97, affection: 98, intellect: 90, aura: 93, mystery: 91 },
  },
  {
    id: 'm15',
    theme: 'modern',
    name: '문채원',
    englishName: 'Moon Chaewon',
    title: '서초동 첫눈 내리는 날의 약속',
    faction: '서초 음악대학원 피아노과',
    role: '피아니스트 · 음대 대학원생',
    age: '24세',
    mbti: 'INFJ',
    location: '하얀 첫눈이 소복이 쌓인 서초동 가로수길',
    image: '/images/modern/m15.jpg',
    accentColor: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.45)',
    badgeText: 'FIRST SNOW PROMISE',
    tags: ['#첫눈의기적', '#빨간목도리', '#겨울로맨스', '#다정한연상녀'],
    quote: '“손 시리지? 내 코트 주머니에 손 넣어. ...첫눈 오는 날 만나자던 약속, 잊지 않고 달려와 줘서 고마워.”',
    backstory:
      '하얀 입김이 피어오르는 겨울 아침, 빨간 목도리를 두르고 정류장 앞에서 언 손을 호호 불며 당신을 기다리던 음대 선배. 피아노 건반 위를 날아다니는 섬세한 손가락이 추위에 얼세라 당신이 손난로를 쥐여주었던 날부터, 매년 첫눈이 내리는 날은 무조건 당신의 것이다.',
    secretNote: '두르고 나온 빨간 목도리는 사실 둘이 함께 두를 수 있을 만큼 일부러 아주 길게 직접 뜨개질한 것이다.',
    stats: { charm: 97, affection: 100, intellect: 95, aura: 94, mystery: 93 },
  },
  {
    id: 'm16',
    theme: 'modern',
    name: '은하수',
    englishName: 'Eun Hasoo',
    title: '성수동 작업실의 로맨스 웹툰 작가',
    faction: 'K-웹툰 금요 로맨스 1위 스튜디오',
    role: '스타 웹툰 작가 (필명 : 은하)',
    age: '21세',
    mbti: 'ENFP',
    location: '햇살이 잘 드는 성수동 루프탑 일러스트 작업실',
    image: '/images/modern/m16.jpg',
    accentColor: '#fbbf24',
    glowColor: 'rgba(251, 191, 36, 0.45)',
    badgeText: 'ROMANCE WEBTOON CREATOR',
    tags: ['#웹툰작가', '#베레모소녀', '#인간비타민', '#너만의뮤즈'],
    quote: '“제 로맨스 웹툰 남주인공 모델이 누구냐고요? 에헤헤, 지금 제 눈앞에서 저만 바라보고 있는 사람요!”',
    backstory:
      '하얀 베레모와 반짝이는 보랏빛 눈동자가 트레이드마크인 금요 로맨스 웹툰 부동의 1위 작가. 마감 후 성수동 카페에서 콘티를 짜던 중 옆자리에 앉은 당신에게 반해, ‘자료 조사를 도와달라’는 핑계로 매주 웹툰 속 데이트 코스를 당신과 실제로 체험하고 있다.',
    secretNote: '연재 중인 웹툰 매 화 마지막 컷 구석에는 당신과 데이트할 때 먹었던 커피잔이나 소품이 이스터에그처럼 그려져 있다.',
    stats: { charm: 98, affection: 98, intellect: 94, aura: 93, mystery: 90 },
  },
];

export { MALE_FANTASY_CHARACTERS, MALE_MODERN_CHARACTERS };

export const HEROINE_CHARACTERS: Character[] = [
  ...FANTASY_CHARACTERS.map((c) => ({ ...c, gender: 'female' as const })),
  ...MODERN_CHARACTERS.map((c) => ({ ...c, gender: 'female' as const })),
];

export const HERO_CHARACTERS: Character[] = [
  ...MALE_FANTASY_CHARACTERS,
  ...MALE_MODERN_CHARACTERS,
];

export const ALL_CHARACTERS: Character[] = [
  ...HEROINE_CHARACTERS,
  ...HERO_CHARACTERS,
];

export function getCharactersByTheme(theme: WorldTheme): Character[] {
  switch (theme) {
    case 'fantasy':
      return FANTASY_CHARACTERS;
    case 'modern':
      return MODERN_CHARACTERS;
    case 'all':
      return HEROINE_CHARACTERS;
    case 'male_fantasy':
      return MALE_FANTASY_CHARACTERS;
    case 'male_modern':
      return MALE_MODERN_CHARACTERS;
    case 'all_male':
      return HERO_CHARACTERS;
    case 'grand_all':
      return ALL_CHARACTERS;
  }
}

export function getCharacterThemeLabel(theme: CharacterTheme): {
  short: string;
  full: string;
  badgeClass: string;
} {
  switch (theme) {
    case 'fantasy':
      return {
        short: 'FANTASY · 히로인 로판',
        full: '서양 중세 판타지 (히로인)',
        badgeClass: 'border-amber-400/40 bg-amber-950/75 text-amber-300',
      };
    case 'modern':
      return {
        short: 'MODERN · 히로인 현대',
        full: '현대 대한민국 (히로인)',
        badgeClass: 'border-sky-400/40 bg-sky-950/75 text-sky-300',
      };
    case 'male_fantasy':
      return {
        short: 'HERO FANTASY · 남주 로판',
        full: '서양 중세 판타지 (여성향 남주)',
        badgeClass: 'border-indigo-400/40 bg-indigo-950/75 text-indigo-300',
      };
    case 'male_modern':
      return {
        short: 'HERO MODERN · 남주 현대',
        full: '현대 대한민국 (여성향 남주)',
        badgeClass: 'border-purple-400/40 bg-purple-950/75 text-purple-300',
      };
  }
}

