import { NextResponse } from 'next/server';
import { readMetadata } from '@/lib/storage/metadata';
import { DEFAULT_SETTINGS, AppSettings } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const metadata = await readMetadata();
    const settings: AppSettings = { ...DEFAULT_SETTINGS, ...metadata.settings };
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Settings fetch error:', error);
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}
