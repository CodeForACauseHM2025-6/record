"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateProfilePicture(userId: string, imageDataUrl: string) {
  const session = await auth();
  if (!session?.user || session.user.id !== userId) {
    throw new Error("Not authorized");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { image: imageDataUrl },
  });

  revalidatePath("/account");
}
