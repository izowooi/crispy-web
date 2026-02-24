import EditPostForm from './EditPostForm';

export const runtime = 'edge';

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditPostForm id={id} />;
}
