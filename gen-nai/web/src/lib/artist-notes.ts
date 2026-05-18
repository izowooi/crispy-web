/**
 * 작가 추가 메타데이터 — 한글명/대표작/특징, NSFW/동인 경고.
 *
 * 211명 전원 커버는 못 함. 인기 상위 + 사용자 본인 예시에 등장한 작가 위주로 큐레이션.
 * 매칭 안 되는 작가는 ArtistPicker가 Danbooru other_names 로 폴백.
 *
 * warning:
 *   - "doujinshi": 동인지 위주 — 결과가 종종 선정적/성인용
 *   - "nsfw":      NSFW 위주 — 명백히 성인용 일러스트 다수
 */

export type ArtistWarning = "doujinshi" | "nsfw";

export type ArtistNote = {
  /** 한글 표기 또는 별칭 */
  alias?: string;
  /** 대표작/특징 1줄 — UI에 노출 */
  desc?: string;
  /** 경고 (UI에 ⚠️ 표시) */
  warning?: ArtistWarning;
};

export const ARTIST_NOTES: Record<string, ArtistNote> = {
  // ────────── 상위 사용 빈도 작가들 ──────────
  mx2j: {
    alias: "미.마.장 / 노송강",
    desc: "한국 디지털 일러스트, 여성 캐릭터 중심",
  },
  "channel_(caststation)": {
    desc: "선명한 색감, 다양한 캐릭터 스타일",
  },
  gogalking: {
    desc: "정돈된 라인, 모에 캐릭터",
  },
  onono_imoko: {
    desc: "부드러운 채색, 일본 모에 스타일",
  },
  ratatatat74: {
    desc: "표현력 있는 표정과 동적 포즈",
  },
  fishine: {
    alias: "피쉬인",
    desc: "한국 일러스트레이터, 정교한 디테일",
  },
  "ie_(raarami)": {
    desc: "라이트노벨풍 채색",
  },
  "wagashi_(dagashiya)": {
    desc: "달콤하고 부드러운 모에 스타일",
  },
  freng: {
    desc: "유려한 라인 + 부드러운 톤",
  },
  ningen_mame: {
    alias: "닝겐마메",
    desc: "몽환적 파스텔 색감, 시그니처 분위기",
  },

  // ────────── 한국 인기 작가 ──────────
  as109: { alias: "AS109", desc: "한국 일러스트, 부드러운 애니풍" },
  taesi: { alias: "태시", desc: "정돈된 색감 + 시네마틱 분위기" },
  kidmo: { alias: "키드모", desc: "디테일한 의상/포즈" },
  kkuem: { alias: "꿈", desc: "선명한 색감 + 여성 캐릭터" },
  monegi: { alias: "모네기", desc: "감각적 조명, 코스튬 디테일" },
  yunsang: { alias: "윤상", desc: "한국 라이트노벨 일러스트" },
  goli_matsumoto: { desc: "한국, 부드러운 여성 캐릭터" },
  joo_sung_kang: { desc: "한국 일러스트레이터, 게임 일러스트" },
  kim_eb: { alias: "김EB", desc: "표현력 있는 표정" },
  urorong: { alias: "우로롱", desc: "한국, 큐트 모에" },
  dduck_kong: { alias: "떡콩" },
  hyulla: { alias: "휼라", desc: "표정 표현 강점" },
  dramz: { desc: "한국 모에 일러스트" },
  "k.pumpkin": { alias: "K.펌킨", desc: "부드러운 채색" },
  xi_xeong: { alias: "시정" },
  "dfm_(darknessdfm)": { alias: "DFM" },
  bumcha: { alias: "범차" },
  "dore_(gilles_dore)": { alias: "도레" },
  yoya_yogurt: { desc: "달콤한 모에 톤" },
  mikan03_26: { desc: "선명한 색감 + 모에" },
  himura_kiseki: { alias: "히무라 키세키", desc: "라이트노벨 일러스트레이터" },
  sushispin: { desc: "한국, 코스튬/포즈 디테일" },
  ukero: { alias: "우케로" },
  mmlyno: { alias: "ㅇㅇㄴㅇ" },
  sos_adult: { desc: "한국 일러스트", warning: "nsfw" },
  quasarcake: { desc: "감각적 색감" },
  "yd_(orangemaru)": { alias: "오랜지마루" },
  xipa: { alias: "시파", desc: "한국 일러스트" },
  drunkoak: { alias: "드렁큰오크" },
  keto_cactus: { desc: "한국 모에" },
  piratescat01: { desc: "한국, 다양한 캐릭터" },
  "sayori_(neko_works)": { alias: "사요리", desc: "네코웍스 — 토끼/고양이귀 모에" },
  "red_(02kakuni)": { desc: "한국, 시그니처 채색" },
  ress: { desc: "한국 일러스트" },
  punc_p: { desc: "한국, 부드러운 일러스트" },
  nyancunbun: { desc: "큐트 모에" },

  // ────────── 중국/대만 인기 작가 ──────────
  qiandaiyiyu: { desc: "중국, 정교한 디테일" },
  "ask_(askzy)": { alias: "askzy", desc: "중국, 회화풍 + 모에 혼합" },
  tianliang_duohe_fangdongye: { desc: "중국, 정밀한 일러스트" },
  dishwasher1910: { desc: "중국, 시네마틱 일러스트" },
  guweiz: { alias: "구웨이즈", desc: "회화풍 판타지/모에 혼합" },
  wlop: { alias: "WLOP", desc: "Ghostblade — 회화풍 반실사" },
  zhibuji_loom: { desc: "중국, 정교한 회화풍" },
  zounose: { desc: "회화풍, 신비로운 분위기" },

  // ────────── 일본 인기 일러스트레이터 ──────────
  kantoku: { alias: "칸토쿠", desc: "유명 일러스트레이터, 다양한 라노벨 표지" },
  mika_pikazo: { alias: "미카 피카조", desc: "강렬한 색감, 캐릭터 디자인" },
  "ke-ta": { desc: "감각적 채색, 의상 디테일" },
  redjuice: { desc: "GUILTY CROWN 등, 모던 일러스트" },
  rumoon: { desc: "부드러운 채색" },
  torino_aqua: { desc: "달콤한 채색, 모에" },
  wanke: { desc: "부드럽고 화려한 채색" },
  ciloranko: { desc: "몽환적 분위기, 시그니처 스타일" },
  rella: { desc: "감성적 일러스트, 시노노메 작품" },
  terras: { desc: "부드러운 채색" },
  "fuumi_(radial_engine)": { desc: "라디알 엔진" },
  ariake_suzu: { desc: "몽환적 부드러운 모에" },
  atdan: { desc: "정교한 캐릭터 디자인" },
  miv4t: { desc: "달콤한 모에 일러스트" },
  "koh_(minto)": { desc: "부드러운 모에" },
  nardack: { desc: "선명한 색감 모에" },
  mochizuki_kei: { desc: "VOCALOID 일러스트로 유명" },
  hanasenrei: { desc: "디테일한 채색" },
  kekemero: { desc: "감각적 채색" },
  anmi: { alias: "안미", desc: "부드러운 라인 + 모에" },
  kazenokaze: { desc: "감성 일러스트" },
  "kawanagare_(harenagari)": { desc: "감성 색감" },
  yoshioka_pochi: { desc: "정교한 캐릭터" },
  "scottie_(phantom2)": { desc: "팬텀2" },
  "kanra_(kanra-agm)": { desc: "선명한 채색" },
  redrop: { desc: "달콤한 채색" },
  hoshi_san_3: { desc: "부드러운 채색" },
  "raita_(masochi)": { desc: "마조치" },
  ohara_tometa: { desc: "유명 일러스트레이터" },
  "akabane_(kabanu)": { desc: "회화풍" },
  "oz_(akakura)": { desc: "오즈" },
  fujishima_kousuke: { alias: "후지시마 코스케", desc: "오! 나의 여신님 / 망념의 잠드" },
  matsubara_hidenori: { alias: "마츠바라 히데노리", desc: "고전 애니 일러스트" },
  morita_kazuaki: { desc: "고전 애니 일러스트" },
  yoshiten: { desc: "샤프한 일러스트" },
  horibe_hiderou: {
    alias: "호리베 히데로우",
    desc: "동인 작가 (성인용 다수)",
    warning: "doujinshi",
  },
  saigado: {
    alias: "사이가도",
    desc: "유명 동인 작가 (성인용 위주)",
    warning: "doujinshi",
  },
  takeuchi_takashi: { alias: "타케우치 타카시", desc: "Fate 시리즈 캐릭터 디자이너" },
  yui_toshiki: { alias: "유이 토시키", desc: "고전 미연시 일러스트", warning: "nsfw" },
  "machi_(machi0910)": { desc: "감각적 채색" },
  "s.u._(simpleu818)": { desc: "달콤한 모에" },
  aya_shobon: { desc: "쇼와 레트로 분위기" },
  mosaaa: { desc: "선명한 채색" },
  miyase_mahiro: { desc: "부드러운 채색" },
  ryusei_hashimoto: { desc: "정교한 일러스트" },
  yoneyama_mai: { alias: "요네야마 마이", desc: "BNA 등, 동적 캐릭터" },
  makihitsuji: { desc: "정교한 채색" },
  "namaru_(summer_dandy)": { desc: "썸머 댄디" },
  "coffee-kizoku": { desc: "라이트노벨 일러스트" },
  "maccha_(mochancc)": { desc: "달콤한 모에" },
  "kuroduki_(pieat)": { desc: "큐트 모에" },
  oyari_ashito: { desc: "고전 미연시" },
  refeia: { desc: "환상적 분위기" },
  "mignon_(mignonpot)": { desc: "큐트 모에" },
  fuji_choko: { desc: "라이트노벨 일러스트" },
  "fukahire_(ruinon)": { desc: "감각적 채색" },
  akizone: { desc: "선명한 채색" },
  hews: { desc: "감각적 채색" },
  koruri: { desc: "부드러운 모에" },
  onineko: { desc: "감성 일러스트" },
  "sho_(sho_lwlw)": { desc: "큐트 모에" },
  // 라이트노벨풍
  tinkle: { desc: "라이트노벨 표지로 유명" },
  abec: { desc: "Sword Art Online 캐릭터 디자이너" },
  kishida_mel: { alias: "키시다 멜", desc: "Aria/Hanasaku Iroha 일러스트" },
  buriki: { desc: "라이트노벨 일러스트" },
  kobuichi: { desc: "유사이 일러스트" },
  muririn: { desc: "라이트노벨 일러스트" },
  suzuhira_hiro: { desc: "유사이 일러스트" },
  misaki_kurehito: { alias: "미사키 쿠레히토", desc: "Saekano 일러스트레이터" },
  tsunako: { desc: "네프튠 시리즈 캐릭터 디자이너" },
  carnelian: { desc: "고전 라이트노벨 일러스트" },
  necomi: { desc: "라이트노벨 일러스트" },
  nagu: { desc: "라이트노벨 일러스트" },
  namori: { alias: "나모리", desc: "유루유리 작가" },
  fkey: { desc: "라이트노벨 일러스트" },
  gilse: { desc: "라이트노벨 일러스트" },
  "yuugen_(yuugen_no_ki)": { desc: "라이트노벨 일러스트" },
  "maruma_(maruma_gic)": { desc: "라이트노벨 일러스트" },
  minaba_hideo: { desc: "Final Fantasy 캐릭터 디자이너" },
  fkj: { desc: "라이트노벨 일러스트" },
  akasaai: { desc: "라이트노벨 일러스트" },

  // ────────── 서양 작가 ──────────
  sakimichan: {
    alias: "사키미찬",
    desc: "Patreon 회화 일러스트, 코스튬 변환 시리즈",
  },
  firolian: { desc: "회화풍, 캐릭터 일러스트", warning: "nsfw" },
  krenz_cushart: { desc: "회화풍 디지털 페인팅 강사" },
  ilya_kuvshinov: { alias: "일리야 쿠브시노프", desc: "모던 디지털 페인팅" },
  ross_tran: { desc: "감각적 디지털 페인팅" },
  loish: { desc: "표현력 있는 캐릭터 페인팅" },
  agnes_cecile: { desc: "수채화 + 인물" },
  bayard_wu: { desc: "회화풍 컨셉 아트" },
  artgerm: { desc: "스탠리 라우 — 코믹스 회화" },
  cutesexyrobutts: {
    alias: "CSR",
    desc: "여성 인체 일러스트 (NSFW 위주)",
    warning: "nsfw",
  },
  dandon_fuga: { desc: "라틴 일러스트", warning: "nsfw" },
  personalami: { desc: "코믹스 풍 일러스트", warning: "nsfw" },
  nixeu: { desc: "회화풍 판타지" },
  ayasal: { desc: "판타지 일러스트" },
  dr_graevling: { desc: "판타지/SF 일러스트" },
};

export function getArtistNote(name: string): ArtistNote | undefined {
  return ARTIST_NOTES[name];
}
