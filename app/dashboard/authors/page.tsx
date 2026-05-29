import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { userMinimalNameSelect } from "@/lib/prisma-selects";
import { SubpageHeader } from "@/app/subpage-header";
import { AuthorsClient } from "@/app/dashboard/authors/authors-client";

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

export default async function AuthorsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!DASHBOARD_ROLES.includes(session.user.role)) redirect("/dashboard");

  const rows = await prisma.user.findMany({
    where: { isPlaceholder: true },
    select: userMinimalNameSelect,
    orderBy: { createdAt: "asc" },
  });
  const initialAuthors = rows.map((u: (typeof rows)[number]) => ({
    id: u.id,
    name: u.name ?? "",
  }));

  return (
    <div className="min-h-screen flex flex-col bg-white font-body page-enter">
      <SubpageHeader pageLabel="Authors" />
      <div className="max-w-[800px] mx-auto px-4 sm:px-8 pt-8 pb-16 w-full">
        <h2 className="font-headline text-[28px] sm:text-[34px] font-bold tracking-wide">
          Directory Authors
        </h2>
        <p className="font-headline text-[14px] text-caption mt-1 tracking-wide">
          Add an HM Google account as an author before they&rsquo;ve logged in.
        </p>
        <div className="mt-4 h-[2px] bg-rule" />
        <AuthorsClient initialAuthors={initialAuthors} />
      </div>
    </div>
  );
}
