import { ClipClient } from './ClipClient';

export const runtime = 'edge';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClipPage({ params }: PageProps) {
  const { id } = await params;
  return <ClipClient id={id} />;
}
