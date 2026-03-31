import { initEncryption } from "../lib/encryption";
import { prisma } from "../lib/prisma";

async function main() {
  // Initialize encryption if key is available
  const key = process.env.ENCRYPTION_KEY;
  if (key) {
    initEncryption(key);
    console.log("Encryption enabled for seeding");
  }
  // Create sample users
  const admin = await prisma.user.upsert({
    where: { email: "admin@horacemann.org" },
    update: {},
    create: {
      email: "admin@horacemann.org",
      name: "Admin User",
      role: "EDITOR",
      isAdmin: true,
    },
  });

  const editor = await prisma.user.upsert({
    where: { email: "editor@horacemann.org" },
    update: {},
    create: {
      email: "editor@horacemann.org",
      name: "Editor User",
      role: "EDITOR",
      isAdmin: false,
    },
  });

  const writer = await prisma.user.upsert({
    where: { email: "writer@horacemann.org" },
    update: {},
    create: {
      email: "writer@horacemann.org",
      name: "Writer User",
      role: "WRITER",
      isAdmin: false,
    },
  });

  // Create sample group
  const group = await prisma.articleGroup.create({
    data: { name: "Sample Edition", issueNumber: "1" },
  });

  // Create sample articles
  const article1 = await prisma.article.upsert({
    where: { slug: "welcome-to-the-record" },
    update: {},
    create: {
      title: "Welcome to The Record",
      slug: "welcome-to-the-record",
      body: "<p>Welcome to the new digital home of The Record, Horace Mann's student newspaper.</p>",
      excerpt: "Welcome to the new digital home of The Record.",
      section: "NEWS",
      groupId: group.id,
      createdById: editor.id,
      credits: {
        create: [{ userId: writer.id, creditRole: "Writer" }],
      },
    },
  });

  const article2 = await prisma.article.upsert({
    where: { slug: "lions-den-season-preview" },
    update: {},
    create: {
      title: "Lions Den Season Preview",
      slug: "lions-den-season-preview",
      body: "<p>A look at what's coming this season for Horace Mann athletics.</p>",
      excerpt: "A look at what's coming this season.",
      section: "LIONS_DEN",
      groupId: group.id,
      createdById: editor.id,
    },
  });

  console.log("Seed data created:", {
    admin: admin.email,
    editor: editor.email,
    writer: writer.email,
    article1: article1.slug,
    article2: article2.slug,
  });
}

main()
  .then(async () => {
    await (prisma as any).$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await (prisma as any).$disconnect();
    process.exit(1);
  });
