"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDirectoryUserByEmail } from "@/lib/google-directory";
import { revalidatePath } from "next/cache";

const DASHBOARD_ROLES = [
  "WRITER",
  "DESIGNER",
  "PHOTOGRAPHER",
  "ART_TEAM",
  "EDITOR",
  "CHIEF_EDITOR",
  "WEB_TEAM",
  "WEB_MASTER",
];

function requireDashboardRole(session: { user?: { role?: string } } | null) {
  if (!session?.user?.role || !DASHBOARD_ROLES.includes(session.user.role)) {
    throw new Error("Dashboard access required");
  }
}

export type AddAuthorResult = { id: string; name: string };

// Look up an @horacemann.org account in the Workspace directory and ensure a User row exists for
// it. Returns the existing user if one already matches the email (real or placeholder) — never
// duplicates. New rows are created as unclaimed placeholders (READER, no Account).
export async function addDirectoryAuthor(email: string): Promise<AddAuthorResult> {
  const session = await auth();
  requireDashboardRole(session);

  const normalized = email.trim().toLowerCase();
  if (!normalized.endsWith("@horacemann.org")) {
    throw new Error("Only @horacemann.org accounts can be added");
  }

  // Dedup: the email is deterministically encrypted, so this where-clause resolves via the
  // emailHash blind index inside the Prisma extension.
  const existing = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true, name: true },
  });
  if (existing) {
    return { id: existing.id, name: existing.name ?? normalized };
  }

  const person = await getDirectoryUserByEmail(normalized);
  if (!person) {
    throw new Error("No matching directory account found");
  }

  const created = await prisma.user.create({
    data: {
      email: person.email.toLowerCase(),
      name: person.name,
      image: person.photoUrl,
      role: "READER",
      isPlaceholder: true,
    } as never,
    select: { id: true, name: true },
  });

  revalidatePath("/dashboard/authors");
  return { id: created.id, name: created.name ?? person.name };
}

// Remove an unclaimed placeholder author. Refuses if the row was claimed (has logged in) or has
// any attribution (authored articles or credits) so we never orphan real authorship.
export async function removeDirectoryAuthor(id: string): Promise<void> {
  const session = await auth();
  requireDashboardRole(session);

  // Check + delete in one interactive transaction so a concurrent article edit can't add a credit
  // between the guard and the delete (which would orphan attribution). None of these fields are
  // encrypted, so the transaction client needs no extension behavior.
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id },
      select: {
        isPlaceholder: true,
        _count: { select: { articles: true, articleCredits: true } },
      },
    });
    if (!user) throw new Error("Author not found");
    if (!user.isPlaceholder) throw new Error("This author has logged in and cannot be removed here");
    if (user._count.articles > 0 || user._count.articleCredits > 0) {
      throw new Error("This author is credited on articles; remove those credits first");
    }
    await tx.user.delete({ where: { id } });
  });

  revalidatePath("/dashboard/authors");
}
