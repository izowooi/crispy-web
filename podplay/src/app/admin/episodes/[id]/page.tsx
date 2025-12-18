import { EditEpisodeClient } from './EditEpisodeClient';

export const runtime = 'edge';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEpisodePage({ params }: PageProps) {
  const { id } = await params;
  return <EditEpisodeClient id={id} />;
}
