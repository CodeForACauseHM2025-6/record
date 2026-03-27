"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

function requireWebMaster(session: { user?: { role?: string } } | null) {
  if (session?.user?.role !== "WEB_MASTER") {
    throw new Error("Only Web Master can perform this action");
  }
}

export async function createGroup(formData: FormData) {
  const session = await auth();
  requireWebMaster(session);

  const name = formData.get("name") as string;
  if (!name) throw new Error("Name is required");

  const group = await prisma.articleGroup.create({
    data: { name },
  });

  redirect(`/dashboard/groups/${group.id}`);
}

export async function updateGroup(id: string, formData: FormData) {
  const session = await auth();
  requireWebMaster(session);

  const name = formData.get("name") as string;
  if (!name) throw new Error("Name is required");

  await prisma.articleGroup.update({
    where: { id },
    data: { name },
  });

  revalidatePath(`/dashboard/groups/${id}`);
}

export async function publishGroup(id: string) {
  const session = await auth();
  requireWebMaster(session);

  await prisma.articleGroup.update({
    where: { id },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });

  revalidatePath("/");
  revalidatePath("/dashboard");
  redirect(`/dashboard/groups/${id}`);
}

export async function unpublishGroup(id: string) {
  const session = await auth();
  requireWebMaster(session);

  await prisma.articleGroup.update({
    where: { id },
    data: { status: "DRAFT", publishedAt: null },
  });

  revalidatePath("/");
  revalidatePath("/dashboard");
  redirect(`/dashboard/groups/${id}`);
}

export async function scheduleGroup(id: string, formData: FormData) {
  const session = await auth();
  requireWebMaster(session);

  const scheduledAt = formData.get("scheduledAt") as string;
  const date = new Date(scheduledAt);
  if (isNaN(date.getTime())) throw new Error("Invalid date");

  await prisma.articleGroup.update({
    where: { id },
    data: { scheduledAt: date },
  });

  revalidatePath(`/dashboard/groups/${id}`);
}

export async function deleteGroup(id: string) {
  const session = await auth();
  requireWebMaster(session);

  await prisma.articleGroup.delete({ where: { id } });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function addRow(groupId: string, formData: FormData) {
  const session = await auth();
  requireWebMaster(session);

  const isFeatured = formData.get("isFeatured") === "true";

  // Get next order
  const lastRow = await prisma.groupRow.findFirst({
    where: { groupId },
    orderBy: { order: "desc" },
  });
  const nextOrder = (lastRow?.order ?? -1) + 1;

  // Parse slot config: e.g. "large" or "medium,small" or "small,small,small"
  const layout = formData.get("layout") as string;
  const sizes = layout.split(",").map((s) => s.trim());

  // Validate total = 3
  const sizeMap: Record<string, number> = { large: 3, medium: 2, small: 1 };
  const total = sizes.reduce((sum, s) => sum + (sizeMap[s] ?? 0), 0);
  if (total !== 3) throw new Error("Row slots must total 3 (large=3, medium=2, small=1)");

  await prisma.groupRow.create({
    data: {
      groupId,
      order: nextOrder,
      isFeatured,
      slots: {
        create: sizes.map((size, i) => ({ size, order: i })),
      },
    },
  });

  revalidatePath(`/dashboard/groups/${groupId}`);
}

export async function deleteRow(rowId: string, groupId: string) {
  const session = await auth();
  requireWebMaster(session);

  await prisma.groupRow.delete({ where: { id: rowId } });

  revalidatePath(`/dashboard/groups/${groupId}`);
}

export async function assignArticleToSlot(slotId: string, articleId: string | null, groupId: string) {
  const session = await auth();
  requireWebMaster(session);

  await prisma.groupSlot.update({
    where: { id: slotId },
    data: {
      articleId: articleId || null,
      mediaUrl: null,
      mediaType: null,
      mediaAlt: null,
      lockToRow: true,
      rowSpan: null,
      autoplay: true,
    },
  });

  revalidatePath(`/dashboard/groups/${groupId}`);
  revalidatePath("/");
}

export async function assignMediaToSlot(
  slotId: string,
  mediaUrl: string,
  mediaType: string,
  mediaAlt: string,
  lockToRow: boolean,
  rowSpan: number | null,
  autoplay: boolean,
  groupId: string,
) {
  const session = await auth();
  requireWebMaster(session);

  await prisma.groupSlot.update({
    where: { id: slotId },
    data: { articleId: null, mediaUrl, mediaType, mediaAlt, lockToRow, rowSpan, autoplay },
  });

  revalidatePath(`/dashboard/groups/${groupId}`);
  revalidatePath("/");
}

export async function clearSlot(slotId: string, groupId: string) {
  const session = await auth();
  requireWebMaster(session);

  await prisma.groupSlot.update({
    where: { id: slotId },
    data: { articleId: null, mediaUrl: null, mediaType: null, mediaAlt: null, lockToRow: true, rowSpan: null, autoplay: true },
  });

  revalidatePath(`/dashboard/groups/${groupId}`);
  revalidatePath("/");
}

export async function addSeparatorRow(groupId: string, afterOrder: number) {
  const session = await auth();
  requireWebMaster(session);

  await prisma.groupRow.updateMany({
    where: { groupId, order: { gt: afterOrder } },
    data: { order: { increment: 1 } },
  });

  await prisma.groupRow.create({
    data: { groupId, order: afterOrder + 1, isSeparator: true },
  });

  revalidatePath(`/dashboard/groups/${groupId}`);
}
