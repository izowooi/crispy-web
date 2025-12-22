import { EditClipClient } from './EditClipClient';

export const runtime = 'edge';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditClipPage({ params }: PageProps) {
  const { id } = await params;
  return <EditClipClient id={id} />;
}
