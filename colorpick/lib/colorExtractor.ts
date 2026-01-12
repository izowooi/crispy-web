export interface ColorInfo {
  hex: string;
  rgb: { r: number; g: number; b: number };
  percentage: number;
}

interface PixelData {
  r: number;
  g: number;
  b: number;
  count: number;
}

// RGB를 HEX로 변환
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('').toUpperCase();
}

// 이미지를 Canvas에 로드하고 리사이즈
async function loadImageToCanvas(
  imageFile: File,
  maxSize: number = 150
): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(imageFile);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // 비율 유지하면서 리사이즈
      let width = img.width;
      let height = img.height;

      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height / width) * maxSize);
          width = maxSize;
        } else {
          width = Math.round((width / height) * maxSize);
          height = maxSize;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      resolve(imageData);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

// 픽셀 데이터를 배열로 변환 (유사한 색상 그룹화)
function getPixelArray(imageData: ImageData): PixelData[] {
  const pixels = imageData.data;
  const colorMap = new Map<string, PixelData>();

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];

    // 투명 픽셀 무시
    if (a < 128) continue;

    // 색상을 약간 양자화하여 유사한 색상 그룹화 (5단위)
    const qr = Math.round(r / 5) * 5;
    const qg = Math.round(g / 5) * 5;
    const qb = Math.round(b / 5) * 5;
    const key = `${qr},${qg},${qb}`;

    if (colorMap.has(key)) {
      const existing = colorMap.get(key)!;
      // 가중 평균으로 색상 업데이트
      const totalCount = existing.count + 1;
      existing.r = (existing.r * existing.count + r) / totalCount;
      existing.g = (existing.g * existing.count + g) / totalCount;
      existing.b = (existing.b * existing.count + b) / totalCount;
      existing.count = totalCount;
    } else {
      colorMap.set(key, { r, g, b, count: 1 });
    }
  }

  return Array.from(colorMap.values());
}

// Median Cut 알고리즘을 사용한 색상 양자화
function medianCut(pixels: PixelData[], numColors: number): PixelData[] {
  if (pixels.length === 0) return [];
  if (pixels.length <= numColors) return pixels;

  // 초기 버킷
  let buckets: PixelData[][] = [pixels];

  // 원하는 색상 수만큼 버킷 분할
  while (buckets.length < numColors) {
    // 가장 큰 범위를 가진 버킷 찾기
    let maxRange = -1;
    let maxBucketIndex = 0;
    let maxChannel: 'r' | 'g' | 'b' = 'r';

    for (let i = 0; i < buckets.length; i++) {
      const bucket = buckets[i];
      if (bucket.length < 2) continue;

      for (const channel of ['r', 'g', 'b'] as const) {
        const values = bucket.map(p => p[channel]);
        const range = Math.max(...values) - Math.min(...values);
        if (range > maxRange) {
          maxRange = range;
          maxBucketIndex = i;
          maxChannel = channel;
        }
      }
    }

    if (maxRange <= 0) break;

    // 가장 큰 버킷을 중앙값으로 분할
    const bucketToSplit = buckets[maxBucketIndex];
    bucketToSplit.sort((a, b) => a[maxChannel] - b[maxChannel]);

    const mid = Math.floor(bucketToSplit.length / 2);
    const bucket1 = bucketToSplit.slice(0, mid);
    const bucket2 = bucketToSplit.slice(mid);

    buckets.splice(maxBucketIndex, 1, bucket1, bucket2);
  }

  // 각 버킷의 평균 색상 계산
  return buckets
    .filter(bucket => bucket.length > 0)
    .map(bucket => {
      let totalCount = 0;
      let totalR = 0;
      let totalG = 0;
      let totalB = 0;

      for (const pixel of bucket) {
        totalCount += pixel.count;
        totalR += pixel.r * pixel.count;
        totalG += pixel.g * pixel.count;
        totalB += pixel.b * pixel.count;
      }

      return {
        r: totalR / totalCount,
        g: totalG / totalCount,
        b: totalB / totalCount,
        count: totalCount
      };
    });
}

// 메인 색상 추출 함수
export async function extractColors(
  imageFile: File,
  numColors: number = 8
): Promise<ColorInfo[]> {
  const imageData = await loadImageToCanvas(imageFile);
  const pixels = getPixelArray(imageData);

  if (pixels.length === 0) {
    return [];
  }

  const dominantColors = medianCut(pixels, numColors);

  // 전체 픽셀 수 계산
  const totalPixels = dominantColors.reduce((sum, p) => sum + p.count, 0);

  // ColorInfo 배열로 변환하고 비율 순으로 정렬
  const colors: ColorInfo[] = dominantColors
    .map(pixel => ({
      hex: rgbToHex(pixel.r, pixel.g, pixel.b),
      rgb: {
        r: Math.round(pixel.r),
        g: Math.round(pixel.g),
        b: Math.round(pixel.b)
      },
      percentage: (pixel.count / totalPixels) * 100
    }))
    .sort((a, b) => b.percentage - a.percentage);

  return colors;
}

// 색상의 밝기 계산 (텍스트 색상 결정에 사용)
export function getLuminance(r: number, g: number, b: number): number {
  // sRGB 밝기 공식
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// 밝기에 따라 텍스트 색상 반환
export function getContrastTextColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return getLuminance(r, g, b) > 0.5 ? '#000000' : '#FFFFFF';
}
