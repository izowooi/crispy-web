/**
 * gen-nai 도메인 타입.
 * NAI API 페이로드는 nai-payload.ts 참고.
 */

export type SamplerId =
  | "euler_ancestral"
  | "euler"
  | "dpmpp_2s_ancestral"
  | "dpmpp_2m_sde"
  | "dpmpp_2m"
  | "dpmpp_sde";

/** UI에서 표시되는 캐릭터 한 명의 추가 프롬프트 */
export type CharacterPrompt = {
  prompt: string;
  negativePrompt: string;
};

/** 클라이언트가 /api/generate로 보내는 입력 */
export type GenerateInput = {
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
  steps: number;
  guidance: number; // NAI parameters.scale
  seed?: number;    // 미지정 시 랜덤
  sampler: SamplerId;
  characters?: CharacterPrompt[];
};

/** /api/generate 응답 */
export type EnqueueResponse = {
  jobId: string;
  /** 1부터 시작, 이 작업이 큐의 몇 번째인지 (포함 위치) */
  position: number;
};

/** /api/job/[id] 응답 */
export type JobStatus =
  | { id: string; status: "queued"; position: number; createdAt: number }
  | { id: string; status: "processing"; createdAt: number }
  | {
      id: string;
      status: "done";
      createdAt: number;
      completedAt: number;
      /** R2 키 배열. 이미지 URL은 `/api/img/${key}` 로 가져온다 */
      imageKeys: string[];
    }
  | { id: string; status: "failed"; createdAt: number; completedAt: number; error: string }
  | { id: string; status: "unknown" };

/** 캐릭터 검색 인덱스의 한 행 */
export type CharacterRow = {
  work: string;
  kor: string;
  eng: string;
};

/** 작가 프리셋 — 인기 스타일에서 추출된 사용 통계 포함 */
export type ArtistPreset = {
  name: string;
  defaultWeight: number;
  minWeight: number;
  maxWeight: number;
  usage: number;
  otherNames?: string[];
  danbooruId?: number;
};

/** 사용자가 선택한 작가 한 명 — 가중치 포함 */
export type ArtistSelection = {
  name: string;
  weight: number;
};
