import { NextResponse } from 'next/server';
import { getMetadataFromR2 } from '@/lib/r2/upload';
import { DEFAULT_SETTINGS, AppSettings } from '@/types';

export const runtime = 'edge';

export async function GET() {
  try {
    const metadata = await getMetadataFromR2();

    // Merge with default settings for backward compatibility
    const settings: AppSettings = {
      ...DEFAULT_SETTINGS,
      ...metadata.settings,
    };

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Settings fetch error:', error);
    // Return default settings on error
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}
