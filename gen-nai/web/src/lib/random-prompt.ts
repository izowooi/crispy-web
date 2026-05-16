/**
 * 랜덤 장면 프롬프트 — 캐릭터 외모는 캐릭터 태그가 책임지고,
 * 여기서는 "장소 + 포즈 + 조명/분위기 + 작가 가중치 + 품질" 만 생성한다.
 * 사용자가 1girl/1boy로 인원도 잠근다.
 */

const POSES = [
  "looking at viewer, soft smile",
  "from above, sitting on a chair",
  "from below, standing, contrapposto",
  "cowboy shot, three quarter view, gentle gaze",
  "close-up portrait, looking aside",
  "lying on grass, hand on cheek",
  "leaning on a railing, wind in hair",
  "holding a coffee cup, reading a book",
  "stretching arms upward, eyes closed",
  "looking back over shoulder",
];

const SCENES = [
  "in a sunlit cafe, blooming flowers by the window",
  "moody neon-lit cyberpunk alley, light rain",
  "rooftop at sunset, gentle wind, lens flare",
  "cozy library at night, golden lamp light",
  "snowy mountain village, warm lanterns",
  "underwater cathedral, god rays through stained glass",
  "blooming cherry blossom street, soft petals in air",
  "old bookstore, dust motes in afternoon sun",
  "seaside cliff at dawn, mist over the water",
  "forest clearing, fireflies, mossy rocks",
  "bedroom with fairy lights, plush bed",
  "rain-soaked tokyo crosswalk at dusk",
  "autumn shrine path, red maple leaves",
];

const ARTISTS = [
  "{{artist:wlop}}, {{artist:guweiz}}",
  "{{artist:as109}}",
  "{{artist:ningen_mame}}",
  "{{artist:ciloranko}}",
  "{{artist:as109}}, {{artist:wanke}}",
  "{{artist:ask_(askzy)}}",
  "{{artist:rumoon}}",
];

const QUALITY = [
  "masterpiece, best quality, very aesthetic, absurdres",
  "masterpiece, best quality, ultra detailed, atmospheric lighting",
  "masterpiece, best quality, year 2024, newest, highres, detailed background",
];

export const DEFAULT_NEGATIVE =
  "lowres, bad anatomy, bad hands, missing fingers, extra digit, fewer digits, blurry, signature, watermark, jpeg artifacts, multiple views, multiple panels";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 캐릭터/인원수와 무관한 "장면" 부분만 생성. 호출자가 캐릭터 태그 + 1girl/1boy를 앞에 붙인다. */
export function randomScene(): string {
  return [pick(POSES), pick(SCENES), pick(ARTISTS), pick(QUALITY)].join(", ");
}
