"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type Role =
  | "READER"
  | "WRITER"
  | "DESIGNER"
  | "PHOTOGRAPHER"
  | "ART_TEAM"
  | "EDITOR"
  | "CHIEF_EDITOR"
  | "WEB_TEAM"
  | "WEB_MASTER";
const ROLES: Role[] = [
  "READER",
  "WRITER",
  "DESIGNER",
  "PHOTOGRAPHER",
  "ART_TEAM",
  "EDITOR",
  "CHIEF_EDITOR",
  "WEB_TEAM",
  "WEB_MASTER",
];
const ADMIN_ROLES = ["WEB_MASTER", "WEB_TEAM"] as const;

async function requireWebMaster() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!(ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
    throw new Error("Forbidden");
  }
  return session;
}

export async function updateUserRole(userId: string, formData: FormData) {
  const session = await requireWebMaster();

  if (session.user.id === userId) {
    throw new Error("You cannot change your own role");
  }

  const role = formData.get("role") as string;
  if (!ROLES.includes(role as Role)) {
    throw new Error("Invalid role");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: role as Role },
  });

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
  redirect(`/admin/users/${userId}?saved=1`);
}

export async function updateUserDisplayTitle(userId: string, formData: FormData) {
  await requireWebMaster();

  const raw = (formData.get("displayTitle") as string | null)?.trim() ?? "";
  const displayTitle = raw.length === 0 ? null : raw;

  await prisma.user.update({
    where: { id: userId },
    data: { displayTitle },
  });

  revalidatePath(`/admin/users/${userId}`);
  redirect(`/admin/users/${userId}?saved=1`);
}

export async function updateUserPriority(userId: string, formData: FormData) {
  await requireWebMaster();

  const raw = ((formData.get("priority") as string | null) ?? "").trim();
  const n = parseInt(raw, 10);
  const priority = Number.isFinite(n) ? n : 0;

  await prisma.user.update({
    where: { id: userId },
    data: { priority },
  });

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/about");
  redirect(`/admin/users/${userId}?saved=1`);
}

export async function updateVolumeNumber(formData: FormData) {
  await requireWebMaster();

  const raw = ((formData.get("volumeNumber") as string | null) ?? "").trim();
  // Only store positive integers; reject anything else.
  const n = parseInt(raw, 10);
  const value = Number.isFinite(n) && n > 0 ? String(n) : "";

  await prisma.siteSetting.upsert({
    where: { key: "volumeNumber" },
    update: { value },
    create: { key: "volumeNumber", value },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/");
  redirect("/admin/settings?saved=1");
}
