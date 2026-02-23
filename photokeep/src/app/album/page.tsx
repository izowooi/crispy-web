import { supabase } from '@/lib/supabase/client';
import type { Album } from '@/types/database';

export default async function AlbumPage() {
  const { data: albums, error } = await supabase
    .from('albums')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center px-4 pt-20">
        <p className="text-sm text-muted">앨범을 불러올 수 없습니다</p>
      </div>
    );
  }

  const list = (albums as Album[]) ?? [];

  return (
    <div>
      <header className="sticky top-0 z-10 border-b border-border bg-background px-4 py-3">
        <h1 className="text-lg font-semibold">앨범</h1>
      </header>

      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 pt-20">
          <p className="text-sm text-muted">아직 앨범이 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1 p-1">
          {list.map((album) => (
            <div key={album.id} className="relative aspect-square overflow-hidden bg-foreground/5">
              {album.cover_photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={album.cover_photo_url}
                  alt={album.title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                <p className="text-sm font-semibold text-white">{album.title}</p>
                {album.description && (
                  <p className="mt-0.5 text-xs text-white/80 line-clamp-1">{album.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
