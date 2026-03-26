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
  const excerpt = (formData.get("excerpt") as string) || undefined;
  const section = formData.get("section") as string;
  const credits = parseCredits(formData);

  if (!title || !body || !section) {
    throw new Error("Title, body, and section are required");
  }

  const slug = await generateUniqueSlug(title);

  const article = await prisma.article.create({
    data: {
      title,
      slug,
      body: sanitizeHtml(body),
      excerpt,
      section: section as "NEWS" | "OPINIONS" | "LIONS_DEN" | "A_AND_E" | "FEATURES" | "THE_ROUNDTABLE",
      createdById: session.user.id,
      credits: credits.length > 0 ? { create: credits } : undefined,
    },
  });

  redirect(`/dashboard/articles/${article.id}/edit`);
}

export async function updateArticle(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const title = formData.get("title") as string;
  const body = formData.get("body") as string;
  const excerpt = (formData.get("excerpt") as string) || null;
  const section = formData.get("section") as string;
  const credits = parseCredits(formData);

  if (!title || !body || !section) {
    throw new Error("Title, body, and section are required");
  }

  // Replace credits: delete existing, create new
  await prisma.articleCredit.deleteMany({ where: { articleId: id } });

  await prisma.article.update({
    where: { id },
    data: {
      title,
      body: sanitizeHtml(body),
      excerpt,
      section: section as "NEWS" | "OPINIONS" | "LIONS_DEN" | "A_AND_E" | "FEATURES" | "THE_ROUNDTABLE",
      credits: credits.length > 0 ? { create: credits } : undefined,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/");
  redirect("/dashboard?saved=1");
}

export async function publishArticle(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

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
  if (!session?.user) throw new Error("Not authenticated");

  await prisma.article.update({
    where: { id },
    data: { status: "DRAFT" },
  });

  revalidatePath("/");
  revalidatePath("/dashboard");
  redirect(`/dashboard/articles/${id}/edit`);
}

export async function toggleFeatured(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) throw new Error("Article not found");

  if (article.isFeatured) {
    // Unfeature it
    await prisma.article.update({
      where: { id },
      data: { isFeatured: false },
    });
  } else {
    // Unfeature all others, then feature this one
    await prisma.article.updateMany({
      where: { isFeatured: true },
      data: { isFeatured: false },
    });
    await prisma.article.update({
      where: { id },
      data: { isFeatured: true },
    });
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
}

export async function deleteArticle(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  await prisma.article.delete({ where: { id } });

  revalidatePath("/");
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
