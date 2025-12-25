import { Clip } from '@/types';

/**
 * Get the filming date from a clip.
 * Falls back to createdAt if filmingDate is not set.
 */
function getFilmingDate(clip: Clip): Date | null {
  if (clip.filmingDate) {
    return new Date(clip.filmingDate);
  }
  // Fallback to createdAt
  return new Date(clip.createdAt);
}

/**
 * Filter clips by specific month and day (across all years).
 * Useful for "every Christmas" or "every birthday" collections.
 *
 * @param clips - Array of clips to filter
 * @param month - Month (1-12)
 * @param day - Day of month (1-31)
 * @returns Filtered clips sorted by year (newest first)
 */
export function filterByMonthDay(clips: Clip[], month: number, day: number): Clip[] {
  return clips
    .filter((clip) => {
      const date = getFilmingDate(clip);
      if (!date || isNaN(date.getTime())) return false;
      return date.getMonth() + 1 === month && date.getDate() === day;
    })
    .sort((a, b) => {
      const dateA = getFilmingDate(a);
      const dateB = getFilmingDate(b);
      if (!dateA || !dateB) return 0;
      return dateB.getTime() - dateA.getTime(); // Newest first
    });
}

/**
 * Filter clips by specific year.
 *
 * @param clips - Array of clips to filter
 * @param year - Year (e.g., 2024)
 * @returns Filtered clips sorted by date (newest first)
 */
export function filterByYear(clips: Clip[], year: number): Clip[] {
  return clips
    .filter((clip) => {
      const date = getFilmingDate(clip);
      if (!date || isNaN(date.getTime())) return false;
      return date.getFullYear() === year;
    })
    .sort((a, b) => {
      const dateA = getFilmingDate(a);
      const dateB = getFilmingDate(b);
      if (!dateA || !dateB) return 0;
      return dateB.getTime() - dateA.getTime(); // Newest first
    });
}

/**
 * Select one random clip per month within a date range.
 * Creates a "monthly timeline" with random selections.
 *
 * @param clips - Array of clips to filter
 * @param startDate - Start of the date range
 * @param endDate - End of the date range
 * @returns Array of clips, one per month (chronological order)
 */
export function selectRandomPerMonth(
  clips: Clip[],
  startDate: Date,
  endDate: Date
): Clip[] {
  // Group clips by year-month
  const clipsByMonth = new Map<string, Clip[]>();

  clips.forEach((clip) => {
    const date = getFilmingDate(clip);
    if (!date || isNaN(date.getTime())) return;

    // Check if within date range
    if (date < startDate || date > endDate) return;

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const existing = clipsByMonth.get(key) || [];
    existing.push(clip);
    clipsByMonth.set(key, existing);
  });

  // Select one random clip per month
  const result: Clip[] = [];

  // Sort keys chronologically
  const sortedKeys = Array.from(clipsByMonth.keys()).sort();

  sortedKeys.forEach((key) => {
    const monthClips = clipsByMonth.get(key)!;
    const randomIndex = Math.floor(Math.random() * monthClips.length);
    result.push(monthClips[randomIndex]);
  });

  return result;
}

/**
 * Get unique years from clips.
 *
 * @param clips - Array of clips
 * @returns Array of years sorted descending (newest first)
 */
export function getUniqueYears(clips: Clip[]): number[] {
  const years = new Set<number>();

  clips.forEach((clip) => {
    const date = getFilmingDate(clip);
    if (date && !isNaN(date.getTime())) {
      years.add(date.getFullYear());
    }
  });

  return Array.from(years).sort((a, b) => b - a);
}

/**
 * Get the date range of all clips.
 *
 * @param clips - Array of clips
 * @returns Object with minDate and maxDate, or null if no clips with dates
 */
export function getDateRange(clips: Clip[]): { minDate: Date; maxDate: Date } | null {
  let minDate: Date | null = null;
  let maxDate: Date | null = null;

  clips.forEach((clip) => {
    const date = getFilmingDate(clip);
    if (!date || isNaN(date.getTime())) return;

    if (!minDate || date < minDate) {
      minDate = date;
    }
    if (!maxDate || date > maxDate) {
      maxDate = date;
    }
  });

  if (!minDate || !maxDate) return null;

  return { minDate, maxDate };
}
