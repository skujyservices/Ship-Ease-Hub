"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function deleteAddress(id: string) {
  const user = await requireUser();
  await db.savedAddress.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/app/account");
}
