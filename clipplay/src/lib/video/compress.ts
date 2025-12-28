'use client';

import {
  Input,
  Output,
  Mp4OutputFormat,
  BufferTarget,
  BlobSource,
  Conversion,
  canEncodeVideo,
  ALL_FORMATS,
} from 'mediabunny';

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  bitrate?: number;
  codec?: 'hevc' | 'avc';
}

export interface CompressionResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  duration: number;
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 720,
  maxHeight: 1280,
  bitrate: 2_000_000, // 2 Mbps
  codec: 'hevc', // 'hevc' or 'avc'
};

/**
 * Check if HEVC (H.265) hardware encoding is supported
 */
export async function isHEVCSupported(): Promise<boolean> {
  try {
    return await canEncodeVideo('hevc', {
      width: 1280,
      height: 720,
      bitrate: 2_000_000,
    });
  } catch {
    return false;
  }
}

/**
 * Check if H.264 (AVC) encoding is supported
 */
export async function isH264Supported(): Promise<boolean> {
  try {
    return await canEncodeVideo('avc', {
      width: 1280,
      height: 720,
      bitrate: 2_000_000,
    });
  } catch {
    return false;
  }
}

/**
 * Check if any video compression is supported
 */
export async function isCompressionSupported(): Promise<{
  supported: boolean;
  hevc: boolean;
  h264: boolean;
}> {
  const [hevc, h264] = await Promise.all([
    isHEVCSupported(),
    isH264Supported(),
  ]);

  return {
    supported: hevc || h264,
    hevc,
    h264,
  };
}

/**
 * Calculate target dimensions while maintaining aspect ratio
 */
function calculateTargetDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight;

  let targetWidth = originalWidth;
  let targetHeight = originalHeight;

  // Check if we need to scale down
  if (targetWidth > maxWidth) {
    targetWidth = maxWidth;
    targetHeight = Math.round(targetWidth / aspectRatio);
  }

  if (targetHeight > maxHeight) {
    targetHeight = maxHeight;
    targetWidth = Math.round(targetHeight * aspectRatio);
  }

  // Ensure dimensions are even (required for video encoding)
  targetWidth = Math.round(targetWidth / 2) * 2;
  targetHeight = Math.round(targetHeight / 2) * 2;

  return { width: targetWidth, height: targetHeight };
}

/**
 * Get video dimensions using a video element
 */
async function getVideoDimensions(file: File): Promise<{
  width: number;
  height: number;
  duration: number;
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video metadata'));
    };

    video.src = URL.createObjectURL(file);
  });
}

/**
 * Compress a video file using WebCodecs and Mediabunny
 */
export async function compressVideo(
  file: File,
  options: CompressionOptions = {},
  onProgress?: (progress: number) => void
): Promise<CompressionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Get original video dimensions
  const { width: originalWidth, height: originalHeight, duration } =
    await getVideoDimensions(file);

  // Calculate target dimensions
  const { width, height } = calculateTargetDimensions(
    originalWidth,
    originalHeight,
    opts.maxWidth,
    opts.maxHeight
  );

  // Check if the requested codec is supported
  const codecSupport = await isCompressionSupported();
  let codec: 'hevc' | 'avc' = opts.codec;

  if (opts.codec === 'hevc' && !codecSupport.hevc) {
    if (codecSupport.h264) {
      codec = 'avc';
      console.warn('HEVC not supported, falling back to H.264 (AVC)');
    } else {
      throw new Error('No video encoding supported in this browser');
    }
  } else if (opts.codec === 'avc' && !codecSupport.h264) {
    if (codecSupport.hevc) {
      codec = 'hevc';
      console.warn('H.264 not supported, using HEVC');
    } else {
      throw new Error('No video encoding supported in this browser');
    }
  }

  // Create input from file
  const input = new Input({
    formats: ALL_FORMATS,
    source: new BlobSource(file),
  });

  // Create output with MP4 format
  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
    target,
  });

  // Initialize conversion
  const conversion = await Conversion.init({
    input,
    output,
    video: {
      width,
      height,
      fit: 'contain',
      codec,
      bitrate: opts.bitrate,
      hardwareAcceleration: 'prefer-hardware',
    },
    audio: {
      codec: 'aac',
      bitrate: 128_000, // 128 kbps
    },
  });

  if (!conversion.isValid) {
    throw new Error('Invalid conversion configuration');
  }

  // Set progress callback
  if (onProgress) {
    conversion.onProgress = (progress: number) => {
      onProgress(progress);
    };
  }

  // Execute conversion
  await conversion.execute();

  // Get result
  const compressedBuffer = target.buffer;
  if (!compressedBuffer) {
    throw new Error('Compression failed: no output buffer');
  }

  const compressedBlob = new Blob([compressedBuffer], { type: 'video/mp4' });

  return {
    blob: compressedBlob,
    originalSize: file.size,
    compressedSize: compressedBlob.size,
    compressionRatio: file.size / compressedBlob.size,
    duration,
  };
}

/**
 * Estimate compressed file size (rough approximation)
 */
export function estimateCompressedSize(
  durationSeconds: number,
  bitrate: number = DEFAULT_OPTIONS.bitrate
): number {
  // Video bitrate + estimated audio bitrate (128 kbps)
  const totalBitrate = bitrate + 128_000;
  // bits to bytes, then add ~10% overhead for container
  return Math.round((totalBitrate * durationSeconds / 8) * 1.1);
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
