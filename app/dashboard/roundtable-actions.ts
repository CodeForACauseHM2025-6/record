"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeHtml } from "@/lib/sanitize";
import { generateUniqueRoundTableSlug } from "@/lib/slugify";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

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

export async function createRoundTable(groupId: string, formData: FormData) {
  const session = await auth();
  requireDashboardRole(session);

  const prompt = (formData.get("prompt") as string)?.trim();
  if (!prompt) throw new Error("Prompt is required");

  const group = await prisma.articleGroup.findUnique({ where: { id: groupId } });
  if (!group) throw new Error("Group not found");

  const slug = await generateUniqueRoundTableSlug(prompt);

  const rt = await prisma.roundTable.create({
    data: {
      slug,
      prompt,
      groupId,
      sides: {
        create: [
          { label: "Side A", order: 0 },
          { label: "Side B", order: 1 },
        ],
      },
    },
  });

  redirect(`/dashboard/roundtables/${rt.id}/edit`);
}

interface SidePayload {
  id: string | null;
  label: string;
  authorIds: string[];
}

interface TurnPayload {
  sideIndex: number;
  body: string;
}

function parseSides(formData: FormData): SidePayload[] {
  const count = parseInt((formData.get("side_count") as string) ?? "0", 10) || 0;
  const sides: SidePayload[] = [];
  for (let i = 0; i < count; i++) {
    const id = (formData.get(`side_${i}_id`) as string) || null;
    const label = ((formData.get(`side_${i}_label`) as string) ?? "").trim() || `Side ${i + 1}`;
    const authorsStr = (formData.get(`side_${i}_authors`) as string) ?? "";
    const authorIds = authorsStr.split(",").map((s) => s.trim()).filter(Boolean);
    sides.push({ id, label, authorIds });
  }
  return sides;
}

function parseTurns(formData: FormData): TurnPayload[] {
  const count = parseInt((formData.get("turn_count") as string) ?? "0", 10) || 0;
  const turns: TurnPayload[] = [];
  for (let i = 0; i < count; i++) {
    const sideIndex = parseInt((formData.get(`turn_${i}_side`) as string) ?? "0", 10) || 0;
    const body = ((formData.get(`turn_${i}_body`) as string) ?? "").trim();
    if (body) turns.push({ sideIndex, body });
  }
  return turns;
}

export async function updateRoundTable(id: string, formData: FormData) {
  const session = await auth();
  requireDashboardRole(session);

  const prompt = ((formData.get("prompt") as string) ?? "").trim();
  if (!prompt) throw new Error("Prompt is required");

  const sides = parseSides(formData);
  const turns = parseTurns(formData);

  if (sides.length !== 2) {
    throw new Error("A round table must have exactly two sides");
  }

  await prisma.roundTable.update({
    where: { id },
    data: { prompt },
  });

  // Update sides: keep stable IDs, update label, replace authors
  const existingSides = await prisma.roundTableSide.findMany({
    where: { roundTableId: id },
    orderBy: { order: "asc" },
  });

  const sideIdByIndex: string[] = [];
  for (let i = 0; i < sides.length; i++) {
    const existing = existingSides[i];
    const payload = sides[i];
    if (existing) {
      await prisma.roundTableSide.update({
        where: { id: existing.id },
        data: { label: payload.label, order: i },
      });
      sideIdByIndex.push(existing.id);
    } else {
      const created = await prisma.roundTableSide.create({
        data: { roundTableId: id, label: payload.label, order: i },
      });
      sideIdByIndex.push(created.id);
    }
    // Replace authors
    await prisma.roundTableSideAuthor.deleteMany({ where: { sideId: sideIdByIndex[i] } });
    if (payload.authorIds.length > 0) {
      await prisma.roundTableSideAuthor.createMany({
        data: payload.authorIds.map((userId) => ({
          sideId: sideIdByIndex[i],
          userId,
        })),
        skipDuplicates: true,
      });
    }
  }

  // Replace all turns
  await prisma.roundTableTurn.deleteMany({ where: { roundTableId: id } });
  if (turns.length > 0) {
    await prisma.roundTableTurn.createMany({
      data: turns.map((t, idx) => ({
        roundTableId: id,
        sideId: sideIdByIndex[t.sideIndex] ?? sideIdByIndex[0],
        body: sanitizeHtml(t.body),
        order: idx,
      })),
    });
  }

  revalidatePath(`/dashboard/roundtables/${id}/edit`);
  const updatedGroupId = (await prisma.roundTable.findUnique({
    where: { id },
    select: { groupId: true },
  }))?.groupId;
  if (updatedGroupId) revalidatePath(`/dashboard/groups/${updatedGroupId}`);
  revalidatePath("/roundtable");
  redirect(`/dashboard/roundtables/${id}/edit?saved=1`);
}

async function getRoundTableGroupId(id: string): Promise<string | null> {
  const rt = await prisma.roundTable.findUnique({
    where: { id },
    select: { groupId: true },
  });
  return rt?.groupId ?? null;
}

export async function publishRoundTable(id: string) {
  const session = await auth();
  requireEditor(session);
  const groupId = await getRoundTableGroupId(id);
  await prisma.roundTable.update({
    where: { id },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
  revalidatePath("/roundtable");
  if (groupId) revalidatePath(`/dashboard/groups/${groupId}`);
  revalidatePath(`/dashboard/roundtables/${id}/edit`);
}

export async function unpublishRoundTable(id: string) {
  const session = await auth();
  requireEditor(session);
  const groupId = await getRoundTableGroupId(id);
  await prisma.roundTable.update({
    where: { id },
    data: { status: "DRAFT", publishedAt: null },
  });
  revalidatePath("/roundtable");
  if (groupId) revalidatePath(`/dashboard/groups/${groupId}`);
  revalidatePath(`/dashboard/roundtables/${id}/edit`);
}

export async function archiveRoundTable(id: string) {
  const session = await auth();
  requireEditor(session);
  const groupId = await getRoundTableGroupId(id);
  await prisma.roundTable.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });
  revalidatePath("/roundtable");
  if (groupId) revalidatePath(`/dashboard/groups/${groupId}`);
}

export async function deleteRoundTable(id: string) {
  const session = await auth();
  requireEditor(session);
  const groupId = await getRoundTableGroupId(id);
  await prisma.roundTable.delete({ where: { id } });
  revalidatePath("/roundtable");
  if (groupId) revalidatePath(`/dashboard/groups/${groupId}`);
  redirect(groupId ? `/dashboard/groups/${groupId}` : "/dashboard");
}
