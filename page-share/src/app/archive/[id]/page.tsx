import { redirect, notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase";

export default async function ArchivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data } = await supabase
    .from("ps_archives")
    .select("storage_path, deleted_at")
    .eq("id", id)
    .maybeSingle();

  if (!data || data.deleted_at) {
    notFound();
  }

  // storage_path is either a local path (/api/archives/{id}/raw)
  // or an R2 public URL (https://pub-xxx.r2.dev/{key}.html)
  redirect(data.storage_path);
}
