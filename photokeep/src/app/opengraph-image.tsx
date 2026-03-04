import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'PhotoKeep - 가족 사진 공유 갤러리';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Camera icon */}
        <svg
          width="88"
          height="88"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#171717"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>

        {/* App name */}
        <div
          style={{
            marginTop: '28px',
            fontSize: '80px',
            fontWeight: 700,
            color: '#171717',
            letterSpacing: '-0.03em',
            lineHeight: 1,
          }}
        >
          PhotoKeep
        </div>

        {/* Tagline */}
        <div
          style={{
            marginTop: '20px',
            fontSize: '30px',
            fontWeight: 400,
            color: '#737373',
            letterSpacing: '0.01em',
          }}
        >
          가족의 소중한 순간을 함께 나누세요
        </div>

        {/* Bottom accent bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '6px',
            backgroundColor: '#171717',
          }}
        />
      </div>
    ),
    { ...size }
  );
}
