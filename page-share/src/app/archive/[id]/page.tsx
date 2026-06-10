import { redirect } from "next/navigation";

export default async function ArchivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/api/archives/${id}/raw`);
}
