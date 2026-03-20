import { PrismaClient, Role, Section, ArticleStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
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
      status: "PUBLISHED",
      publishedAt: new Date(),
      createdById: editor.id,
      credits: {
        create: [
          { userId: writer.id, creditRole: "Writer" },
        ],
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
      status: "DRAFT",
      createdById: editor.id,
    },
  });

  console.log("Seed data created:", { admin, editor, writer, article1: article1.slug, article2: article2.slug });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
