import { cookies } from "next/headers";
import { editCookieName, editToken } from "./auth";
import type { Daycare } from "./db";

export async function canEdit(daycare: Daycare): Promise<boolean> {
  const store = await cookies();
  const token = store.get(editCookieName(daycare.id))?.value;
  return Boolean(token) && token === (await editToken(daycare.id, daycare.pinHash));
}
