import { EpisodeClient } from './EpisodeClient';

export const runtime = 'edge';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EpisodePage({ params }: PageProps) {
  const { id } = await params;
  return <EpisodeClient id={id} />;
}
