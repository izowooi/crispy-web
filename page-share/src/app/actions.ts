"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase";
import { isAdminSession } from "@/lib/admin";

async function requireAdmin() {
  if (!(await isAdminSession())) {
    throw new Error("Unauthorized");
  }
}

export async function deleteArchive(id: string): Promise<void> {
  await requireAdmin();
  const supabase = createServerClient();
  const { error } = await supabase
    .from("ps_archives")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function setPrivate(id: string, isPrivate: boolean): Promise<void> {
  await requireAdmin();
  const supabase = createServerClient();
  const { error } = await supabase
    .from("ps_archives")
    .update({ is_private: isPrivate })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}
