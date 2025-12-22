'use client';

import Link from 'next/link';
import { useAuthContext } from '@/context/AuthContext';

export const runtime = 'edge';

export default function TestDashboard() {
  const { user, isAuthenticated, isAdmin, isLoading } = useAuthContext();
  const r2Url = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

  const testPages = [
    {
      href: '/test/auth',
      title: 'Google Login Test',
      description: 'Test Google OAuth login/logout flow',
      icon: '🔐',
    },
    {
      href: '/test/r2',
      title: 'R2 Connection Test',
      description: 'Test R2 bucket connection and metadata.json',
      icon: '☁️',
    },
    {
      href: '/test/upload',
      title: 'Upload Test',
      description: 'Test video file upload to R2',
      icon: '📤',
    },
    {
      href: '/test/video',
      title: 'Video Player Test',
      description: 'Test video playback from R2',
      icon: '🎬',
    },
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-2">ClipPlay Test Dashboard</h1>
        <p className="text-foreground/60 mb-8">Development and testing tools</p>

        {/* Environment Info */}
        <div className="bg-card-bg border border-card-border rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Environment Info</h2>
          <div className="space-y-2 text-sm font-mono">
            <div className="flex gap-2">
              <span className="text-foreground/60">R2 Public URL:</span>
              <span className="text-foreground">{r2Url || '(not set)'}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-foreground/60">Auth Status:</span>
              <span className={isAuthenticated ? 'text-green-500' : 'text-red-500'}>
                {isLoading ? 'Loading...' : isAuthenticated ? 'Logged In' : 'Not Logged In'}
              </span>
            </div>
            {isAuthenticated && user && (
              <>
                <div className="flex gap-2">
                  <span className="text-foreground/60">User:</span>
                  <span className="text-foreground">{user.email}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-foreground/60">Admin:</span>
                  <span className={isAdmin ? 'text-green-500' : 'text-yellow-500'}>
                    {isAdmin ? 'Yes' : 'No'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Test Pages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {testPages.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className="block bg-card-bg border border-card-border rounded-lg p-6 hover:border-primary transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{page.icon}</span>
                <h3 className="text-lg font-semibold text-foreground">{page.title}</h3>
              </div>
              <p className="text-foreground/60 text-sm">{page.description}</p>
            </Link>
          ))}
        </div>

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-primary hover:underline"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
