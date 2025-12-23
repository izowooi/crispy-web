/**
 * Capture a frame from a video element at a specific timestamp
 * @param videoElement - The video element to capture from
 * @param timestamp - The time in seconds to capture
 * @param quality - JPEG quality (0-1), default 0.8
 * @returns Promise<Blob> - The captured frame as a JPEG blob
 */
export async function captureVideoFrame(
  videoElement: HTMLVideoElement,
  timestamp: number,
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Store original time to restore later
    const originalTime = videoElement.currentTime;

    const handleSeeked = () => {
      try {
        // Create canvas with video dimensions
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;

        // Draw the video frame to canvas
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob from canvas'));
            }
          },
          'image/jpeg',
          quality
        );

        // Restore original time
        videoElement.currentTime = originalTime;
      } catch (error) {
        reject(error);
      } finally {
        videoElement.removeEventListener('seeked', handleSeeked);
      }
    };

    const handleError = () => {
      videoElement.removeEventListener('seeked', handleSeeked);
      videoElement.removeEventListener('error', handleError);
      reject(new Error('Failed to seek video'));
    };

    videoElement.addEventListener('seeked', handleSeeked, { once: true });
    videoElement.addEventListener('error', handleError, { once: true });

    // Seek to the specified timestamp
    videoElement.currentTime = timestamp;
  });
}

/**
 * Create a File object from a Blob for form submission
 * @param blob - The blob to convert
 * @param filename - The filename to use
 * @returns File - The file object
 */
export function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type });
}

/**
 * Format seconds to mm:ss display
 * @param seconds - Total seconds
 * @returns Formatted time string
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
