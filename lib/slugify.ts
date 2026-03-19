import slugifyLib from "slugify";
import { prisma } from "@/lib/prisma";

export async function generateUniqueSlug(title: string): Promise<string> {
  const base = slugifyLib(title, { lower: true, strict: true });
  let slug = base;
  let suffix = 2;

  while (await prisma.article.findFirst({ where: { slug } })) {
    slug = `${base}-${suffix}`;
    suffix++;
  }

  return slug;
}
