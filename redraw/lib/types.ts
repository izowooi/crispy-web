// 스타일 프리셋 타입
export interface StylePreset {
  id: string;
  name: string;
  prompt: string;
  category: 'cartoon' | 'art' | 'vintage' | 'material' | 'game' | 'viral';
  description: string;
}

// 예측 상태 타입
export interface Prediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string;
  error?: string;
}

// 생성 요청 타입
export interface GenerationRequest {
  inputImageUrl: string;
  mode: 'style' | 'reference';
  selectedStyles?: string[];
  referenceImages?: string[];
}

// 생성 결과 타입
export interface GenerationResult {
  styleId?: string;
  styleName?: string;
  predictionId: string;
  imageUrl?: string;
  error?: string;
}
