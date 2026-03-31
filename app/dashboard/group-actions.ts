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

const DASHBOARD_ROLES = ["WRITER", "DESIGNER", "EDITOR", "WEB_TEAM", "WEB_MASTER"];
const EDITOR_ROLES = ["EDITOR", "WEB_TEAM", "WEB_MASTER"];

function requireDashboardRole(session: { user?: { role?: string } } | null) {
  if (!session?.user?.role || !DASHBOARD_ROLES.includes(session.user.role)) {
    throw new Error("Dashboard access required");
  }
}

function requireEditor(session: { user?: { role?: string } } | null) {
  if (!session?.user?.role || !EDITOR_ROLES.includes(session.user.role)) {
    throw new Error("Editor access required");
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
  const issueNumber = (formData.get("issueNumber") as string) || null;
  if (!name) throw new Error("Name is required");

  await prisma.articleGroup.update({
    where: { id },
    data: { name, issueNumber },
  });

  revalidatePath(`/dashboard/groups/${id}`);
  revalidatePath("/");
  redirect(`/dashboard/groups/${id}?saved=1`);
}

export async function publishGroup(id: string) {
  const session = await auth();
  requireEditor(session);

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
  requireEditor(session);

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
  requireEditor(session);

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
  requireDashboardRole(session);

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
  requireDashboardRole(session);

  await prisma.groupRow.deleteMany({ where: { id: rowId } });

  revalidatePath(`/dashboard/groups/${groupId}`);
}

export async function assignArticleToSlot(slotId: string, articleId: string | null, groupId: string) {
  const session = await auth();
  requireDashboardRole(session);

  await prisma.groupSlot.update({
    where: { id: slotId },
    data: {
      articleId: articleId || null,
      mediaUrl: null,
      mediaType: null,
      mediaAlt: null,
      mediaCredit: null,
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
  mediaCredit: string,
  lockToRow: boolean,
  rowSpan: number | null,
  autoplay: boolean,
  groupId: string,
) {
  const session = await auth();
  requireDashboardRole(session);

  await prisma.groupSlot.update({
    where: { id: slotId },
    data: { articleId: null, mediaUrl, mediaType, mediaAlt, mediaCredit, lockToRow, rowSpan, autoplay },
  });

  revalidatePath(`/dashboard/groups/${groupId}`);
  revalidatePath("/");
}

export async function clearSlot(slotId: string, groupId: string) {
  const session = await auth();
  requireDashboardRole(session);

  await prisma.groupSlot.update({
    where: { id: slotId },
    data: { articleId: null, mediaUrl: null, mediaType: null, mediaAlt: null, mediaCredit: null, lockToRow: true, rowSpan: null, autoplay: true },
  });

  revalidatePath(`/dashboard/groups/${groupId}`);
  revalidatePath("/");
}

export async function updateSlotSpan(slotId: string, lockToRow: boolean, rowSpan: number | null, groupId: string) {
  const session = await auth();
  requireDashboardRole(session);

  await prisma.groupSlot.update({
    where: { id: slotId },
    data: { lockToRow, rowSpan },
  });

  revalidatePath(`/dashboard/groups/${groupId}`);
  revalidatePath("/");
}

export async function updateRow(rowId: string, groupId: string, formData: FormData) {
  const session = await auth();
  requireDashboardRole(session);

  const layout = formData.get("layout") as string;
  const isFeatured = formData.get("isFeatured") === "true";

  const sizeMap: Record<string, number> = { large: 3, medium: 2, small: 1 };
  const newSizes = layout.split(",").map((s) => s.trim());
  const total = newSizes.reduce((sum, s) => sum + (sizeMap[s] ?? 0), 0);
  if (total !== 3) throw new Error("Row slots must total 3");

  // Update featured flag
  await prisma.groupRow.update({ where: { id: rowId }, data: { isFeatured } });

  // Get current slots
  const currentSlots = await prisma.groupSlot.findMany({
    where: { rowId },
    orderBy: { order: "asc" },
  });

  const currentLayout = currentSlots.map((s: (typeof currentSlots)[number]) => s.size).join(",");
  if (currentLayout !== layout) {
    // Layout changed — delete old slots and create new ones
    await prisma.groupSlot.deleteMany({ where: { rowId } });
    await prisma.groupSlot.createMany({
      data: newSizes.map((size, i) => ({ rowId, size, order: i })),
    });
  }

  revalidatePath(`/dashboard/groups/${groupId}`);
  revalidatePath("/");
}

export async function reorderRows(groupId: string, rowIds: string[]) {
  const session = await auth();
  requireDashboardRole(session);

  await Promise.all(
    rowIds.map((id, i) =>
      prisma.groupRow.update({ where: { id }, data: { order: i } })
    )
  );

  revalidatePath(`/dashboard/groups/${groupId}`);
  revalidatePath("/");
}

export async function addSeparatorRow(groupId: string, afterOrder: number) {
  const session = await auth();
  requireDashboardRole(session);

  await prisma.groupRow.updateMany({
    where: { groupId, order: { gt: afterOrder } },
    data: { order: { increment: 1 } },
  });

  await prisma.groupRow.create({
    data: { groupId, order: afterOrder + 1, isSeparator: true },
  });

  revalidatePath(`/dashboard/groups/${groupId}`);
}

export async function approveGroup(groupId: string) {
  const session = await auth();
  requireDashboardRole(session);

  await prisma.approval.create({
    data: { userId: session!.user!.id, groupId },
  });

  revalidatePath(`/dashboard/groups/${groupId}`);
}

export async function removeGroupApproval(approvalId: string, groupId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const approval = await prisma.approval.findUnique({ where: { id: approvalId } });
  if (!approval) throw new Error("Approval not found");

  if (approval.userId !== session.user.id && session.user.role !== "WEB_MASTER") {
    throw new Error("You can only remove your own approval");
  }

  await prisma.approval.delete({ where: { id: approvalId } });

  revalidatePath(`/dashboard/groups/${groupId}`);
}

export async function createGroupWithArticles(formData: FormData) {
  const session = await auth();
  requireWebMaster(session);

  const name = formData.get("name") as string;
  const issueNumber = (formData.get("issueNumber") as string) || null;
  const articleIds = formData.getAll("articleIds") as string[];

  if (!name) throw new Error("Name is required");

  const group = await prisma.articleGroup.create({
    data: {
      name,
      issueNumber,
      articles: articleIds.length > 0
        ? { connect: articleIds.map((id) => ({ id })) }
        : undefined,
    },
  });

  redirect(`/dashboard/groups/${group.id}`);
}
