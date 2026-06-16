export const runtime = "edge";

import { redirect, notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { isAdminSession } from "@/lib/admin";
import { canViewArchive } from "@/lib/visibility";

export default async function ArchivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data } = await supabase
    .from("ps_archives")
    .select("storage_path, deleted_at, is_private")
    .eq("id", id)
    .maybeSingle();

  if (!data || data.deleted_at) {
    notFound();
  }

  // Private archives are viewable only by an authenticated admin. Non-admins get 404
  // (indistinguishable from a missing archive — don't reveal that a private one exists).
  if (!canViewArchive(data.is_private, await isAdminSession())) {
    notFound();
  }

  // storage_path is an R2 public URL (https://pub-xxx.r2.dev/{key}.html)
  redirect(data.storage_path);
}
