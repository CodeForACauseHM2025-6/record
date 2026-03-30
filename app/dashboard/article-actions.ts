"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeHtml } from "@/lib/sanitize";
import { generateUniqueSlug } from "@/lib/slugify";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

function parseCredits(formData: FormData) {
  const count = parseInt(formData.get("credit_count") as string, 10) || 0;
  const credits: { userId: string; creditRole: string }[] = [];
  for (let i = 0; i < count; i++) {
    const userId = formData.get(`credit_user_${i}`) as string;
    const creditRole = formData.get(`credit_role_${i}`) as string;
    if (userId && creditRole) {
      credits.push({ userId, creditRole });
    }
  }
  return credits;
}

export async function createArticle(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const title = formData.get("title") as string;
  const body = formData.get("body") as string;
  const section = formData.get("section") as string;
  const featuredImage = (formData.get("featuredImage") as string) || null;
  const credits = parseCredits(formData);

  if (!title || !body || !section) {
    throw new Error("Title, body, and section are required");
  }

  if (title.trim().toLowerCase() === "media") {
    throw new Error("Articles cannot be titled 'Media'");
  }

  const slug = await generateUniqueSlug(title);

  const article = await prisma.article.create({
    data: {
      title,
      slug,
      body: sanitizeHtml(body),
      featuredImage,
      section: section as "NEWS" | "OPINIONS" | "LIONS_DEN" | "A_AND_E" | "FEATURES" | "THE_ROUNDTABLE",
      createdById: session.user.id,
      credits: credits.length > 0 ? { create: credits } : undefined,
    },
  });

  redirect(`/dashboard/articles/${article.id}/edit`);
}

export async function createArticleInGroup(groupId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const title = formData.get("title") as string;
  const body = formData.get("body") as string;
  const section = formData.get("section") as string;
  const featuredImage = (formData.get("featuredImage") as string) || null;
  const credits = parseCredits(formData);

  if (!title || !body || !section) {
    throw new Error("Title, body, and section are required");
  }

  if (title.trim().toLowerCase() === "media") {
    throw new Error("Articles cannot be titled 'Media'");
  }

  const slug = await generateUniqueSlug(title);

  await prisma.article.create({
    data: {
      title,
      slug,
      body: sanitizeHtml(body),
      featuredImage,
      section: section as "NEWS" | "OPINIONS" | "LIONS_DEN" | "A_AND_E" | "FEATURES" | "THE_ROUNDTABLE",
      createdById: session.user.id,
      credits: credits.length > 0 ? { create: credits } : undefined,
      groups: { connect: { id: groupId } },
    },
  });

  redirect(`/dashboard/groups/${groupId}`);
}

export async function updateArticle(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const title = formData.get("title") as string;
  const body = formData.get("body") as string;
  const section = formData.get("section") as string;
  const featuredImage = (formData.get("featuredImage") as string) || null;
  const credits = parseCredits(formData);

  if (!title || !body || !section) {
    throw new Error("Title, body, and section are required");
  }

  if (title.trim().toLowerCase() === "media") {
    throw new Error("Articles cannot be titled 'Media'");
  }

  await prisma.articleCredit.deleteMany({ where: { articleId: id } });

  await prisma.article.update({
    where: { id },
    data: {
      title,
      body: sanitizeHtml(body),
      featuredImage,
      section: section as "NEWS" | "OPINIONS" | "LIONS_DEN" | "A_AND_E" | "FEATURES" | "THE_ROUNDTABLE",
      credits: credits.length > 0 ? { create: credits } : undefined,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/");
  redirect("/dashboard?saved=1");
}

function requireWebMaster(session: { user?: { role?: string } } | null) {
  if (session?.user?.role !== "WEB_MASTER") {
    throw new Error("Only Web Master can perform this action");
  }
}

const EDITOR_ROLES = ["EDITOR", "WEB_TEAM", "WEB_MASTER"];

function requireEditor(session: { user?: { role?: string } } | null) {
  if (!session?.user?.role || !EDITOR_ROLES.includes(session.user.role)) {
    throw new Error("Editor access required");
  }
}

export async function publishArticle(id: string) {
  const session = await auth();
  requireEditor(session);

  const creditCount = await prisma.articleCredit.count({ where: { articleId: id } });
  if (creditCount === 0) {
    throw new Error("Cannot publish without at least one author");
  }

  await prisma.article.update({
    where: { id },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });

  revalidatePath("/");
  revalidatePath("/dashboard");
  redirect(`/dashboard/articles/${id}/edit`);
}

export async function unpublishArticle(id: string) {
  const session = await auth();
  requireEditor(session);

  await prisma.article.update({
    where: { id },
    data: { status: "DRAFT" },
  });

  revalidatePath("/");
  revalidatePath("/dashboard");
  redirect(`/dashboard/articles/${id}/edit`);
}

export async function deleteArticle(id: string) {
  const session = await auth();
  requireWebMaster(session);

  await prisma.article.delete({ where: { id } });

  revalidatePath("/");
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function approveArticle(articleId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  await prisma.approval.create({
    data: { userId: session.user.id, articleId },
  });

  revalidatePath(`/dashboard/articles/${articleId}/edit`);
}

export async function removeArticleApproval(approvalId: string, articleId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const approval = await prisma.approval.findUnique({ where: { id: approvalId } });
  if (!approval) throw new Error("Approval not found");

  // Users can remove their own approval; WM can remove anyone's
  if (approval.userId !== session.user.id && session.user.role !== "WEB_MASTER") {
    throw new Error("You can only remove your own approval");
  }

  await prisma.approval.delete({ where: { id: approvalId } });

  revalidatePath(`/dashboard/articles/${articleId}/edit`);
}
