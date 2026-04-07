"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { PATTERNS } from "@/lib/patterns";

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

export async function addBlock(groupId: string, column: string, pattern: string) {
  const session = await auth();
  requireDashboardRole(session);

  const patternDef = PATTERNS[pattern];
  if (!patternDef) throw new Error("Unknown pattern");
  if (patternDef.column !== column) throw new Error("Pattern not valid for this column");

  const lastBlock = await prisma.layoutBlock.findFirst({
    where: { groupId, column },
    orderBy: { order: "desc" },
  });
  const nextOrder = (lastBlock?.order ?? -1) + 1;

  await prisma.layoutBlock.create({
    data: {
      groupId,
      column,
      pattern,
      order: nextOrder,
      slots: {
        create: patternDef.slots.map((s, i) => ({
          slotRole: s.role,
          order: i,
        })),
      },
    },
  });

  revalidatePath(`/dashboard/groups/${groupId}`);
  revalidatePath("/");
}

export async function deleteBlock(blockId: string, groupId: string) {
  const session = await auth();
  requireDashboardRole(session);

  await prisma.layoutBlock.delete({ where: { id: blockId } });

  revalidatePath(`/dashboard/groups/${groupId}`);
  revalidatePath("/");
}

export async function reorderBlocks(groupId: string, column: string, blockIds: string[]) {
  const session = await auth();
  requireDashboardRole(session);

  await Promise.all(
    blockIds.map((id, i) =>
      prisma.layoutBlock.update({ where: { id }, data: { order: i } })
    )
  );

  revalidatePath(`/dashboard/groups/${groupId}`);
  revalidatePath("/");
}

export async function updateDividerStyle(blockId: string, style: string, groupId: string) {
  const session = await auth();
  requireDashboardRole(session);

  await prisma.layoutBlock.update({
    where: { id: blockId },
    data: { dividerStyle: style },
  });

  revalidatePath(`/dashboard/groups/${groupId}`);
  revalidatePath("/");
}

export async function assignToBlockSlot(slotId: string, articleId: string | null, groupId: string) {
  const session = await auth();
  requireDashboardRole(session);

  await prisma.blockSlot.update({
    where: { id: slotId },
    data: {
      articleId: articleId || null,
    },
  });

  revalidatePath(`/dashboard/groups/${groupId}`);
  revalidatePath("/");
}

export async function assignMediaToBlockSlot(
  slotId: string,
  mediaUrl: string,
  mediaType: string,
  mediaAlt: string,
  mediaCredit: string,
  groupId: string,
) {
  const session = await auth();
  requireDashboardRole(session);

  await prisma.blockSlot.update({
    where: { id: slotId },
    data: { mediaUrl, mediaType, mediaAlt, mediaCredit },
  });

  revalidatePath(`/dashboard/groups/${groupId}`);
  revalidatePath("/");
}

export async function clearBlockSlot(slotId: string, groupId: string) {
  const session = await auth();
  requireDashboardRole(session);

  await prisma.blockSlot.updateMany({
    where: { id: slotId },
    data: { articleId: null, mediaUrl: null, mediaType: null, mediaAlt: null, mediaCredit: null },
  });

  revalidatePath(`/dashboard/groups/${groupId}`);
  revalidatePath(`/dashboard/groups/${groupId}/layout`);
  revalidatePath("/");
}

export async function clearSlotArticle(slotId: string, groupId: string) {
  const session = await auth();
  requireDashboardRole(session);

  await prisma.blockSlot.updateMany({
    where: { id: slotId },
    data: { articleId: null },
  });

  revalidatePath(`/dashboard/groups/${groupId}`);
  revalidatePath(`/dashboard/groups/${groupId}/layout`);
  revalidatePath("/");
}

export async function updateSlotScale(slotId: string, scale: string, groupId: string) {
  const session = await auth();
  requireDashboardRole(session);

  if (!["S", "M", "L", "XL"].includes(scale)) throw new Error("Invalid scale");

  await prisma.blockSlot.update({
    where: { id: slotId },
    data: { scale },
  });

  revalidatePath(`/dashboard/groups/${groupId}`);
  revalidatePath(`/dashboard/groups/${groupId}/layout`);
  revalidatePath("/");
}

export async function updateSlotImageScale(slotId: string, imageScale: string, groupId: string) {
  const session = await auth();
  requireDashboardRole(session);

  if (!["S", "M", "L", "XL"].includes(imageScale)) throw new Error("Invalid scale");

  await prisma.blockSlot.update({
    where: { id: slotId },
    data: { imageScale },
  });

  revalidatePath(`/dashboard/groups/${groupId}`);
  revalidatePath(`/dashboard/groups/${groupId}/layout`);
  revalidatePath("/");
}

export async function updateSlotPreviewLength(slotId: string, length: number, groupId: string) {
  const session = await auth();
  requireDashboardRole(session);

  const clamped = Math.max(50, Math.min(500, Math.round(length)));
  await prisma.blockSlot.update({
    where: { id: slotId },
    data: { previewLength: clamped },
  });

  revalidatePath("/");
}

export async function toggleSlotFeatured(slotId: string, featured: boolean, groupId: string) {
  const session = await auth();
  requireDashboardRole(session);

  await prisma.blockSlot.update({
    where: { id: slotId },
    data: { featured },
  });

  revalidatePath(`/dashboard/groups/${groupId}/layout`);
  revalidatePath("/");
}

export async function toggleSlotByline(slotId: string, showByline: boolean, groupId: string) {
  const session = await auth();
  requireDashboardRole(session);

  await prisma.blockSlot.update({
    where: { id: slotId },
    data: { showByline },
  });

  revalidatePath(`/dashboard/groups/${groupId}/layout`);
  revalidatePath("/");
}

export async function updateImageFloat(slotId: string, imageFloat: string, groupId: string) {
  const session = await auth();
  requireDashboardRole(session);

  if (!["left", "right", "full"].includes(imageFloat)) throw new Error("Invalid imageFloat");

  await prisma.blockSlot.update({
    where: { id: slotId },
    data: { imageFloat },
  });

  revalidatePath(`/dashboard/groups/${groupId}`);
  revalidatePath(`/dashboard/groups/${groupId}/layout`);
  revalidatePath("/");
}

export async function updateImageWidth(slotId: string, imageWidth: number, groupId: string) {
  const session = await auth();
  requireDashboardRole(session);

  const clamped = Math.max(10, Math.min(100, Math.round(imageWidth)));
  await prisma.blockSlot.update({
    where: { id: slotId },
    data: { imageWidth: clamped },
  });

  revalidatePath(`/dashboard/groups/${groupId}`);
  revalidatePath(`/dashboard/groups/${groupId}/layout`);
  revalidatePath("/");
}

export async function updateImageCrop(slotId: string, imageCrop: string, imageCropCustom: string | null, groupId: string) {
  const session = await auth();
  requireDashboardRole(session);

  if (!["original", "landscape", "portrait", "square", "custom"].includes(imageCrop)) throw new Error("Invalid imageCrop");

  await prisma.blockSlot.update({
    where: { id: slotId },
    data: { imageCrop, imageCropCustom: imageCrop === "custom" ? imageCropCustom : null },
  });

  revalidatePath(`/dashboard/groups/${groupId}`);
  revalidatePath(`/dashboard/groups/${groupId}/layout`);
  revalidatePath("/");
}

export async function updateMediaCredit(slotId: string, mediaCredit: string, groupId: string) {
  const session = await auth();
  requireDashboardRole(session);

  await prisma.blockSlot.update({
    where: { id: slotId },
    data: { mediaCredit },
  });

  revalidatePath(`/dashboard/groups/${groupId}`);
  revalidatePath(`/dashboard/groups/${groupId}/layout`);
  revalidatePath("/");
}

export async function clearSlotMedia(slotId: string, groupId: string) {
  const session = await auth();
  requireDashboardRole(session);

  await prisma.blockSlot.updateMany({
    where: { id: slotId },
    data: { mediaUrl: null, mediaType: null, mediaAlt: null, mediaCredit: null },
  });

  revalidatePath(`/dashboard/groups/${groupId}`);
  revalidatePath(`/dashboard/groups/${groupId}/layout`);
  revalidatePath("/");
}
