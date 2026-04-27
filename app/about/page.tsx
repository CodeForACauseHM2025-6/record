import { prisma } from "@/lib/prisma";
import { SubpageHeader } from "@/app/subpage-header";
import { Footer } from "@/app/footer";
import Link from "next/link";

const ROLE_LABELS: Record<string, string> = {
  WRITER: "Staff Writer",
  DESIGNER: "Designer",
  EDITOR: "Editor",
  WEB_TEAM: "Web Team",
  WEB_MASTER: "Web Master",
};

const ROLE_GROUP_TITLES: Record<string, string> = {
  EDITOR: "Editors",
  WRITER: "Writers",
  DESIGNER: "Designers",
  WEB_MASTER: "Web Master",
  WEB_TEAM: "Web Team",
};

const ROLE_ORDER = ["EDITOR", "WRITER", "DESIGNER", "WEB_MASTER", "WEB_TEAM"];

interface StaffUser {
  id: string;
  name: string;
  role: string;
  displayTitle: string | null;
}

export default async function AboutPage() {
  const users = (await prisma.user.findMany({
    where: { role: { not: "READER" } },
    select: { id: true, name: true, role: true, displayTitle: true },
    orderBy: { name: "asc" },
  })) as unknown as StaffUser[];

  const grouped: Record<string, StaffUser[]> = {};
  for (const role of ROLE_ORDER) grouped[role] = [];
  for (const u of users) {
    if (grouped[u.role]) grouped[u.role].push(u);
  }

  return (
    <div className="min-h-screen flex flex-col bg-white font-body page-enter">
      <SubpageHeader pageLabel="About" />

      <main className="max-w-[900px] mx-auto px-4 sm:px-8 pt-10 pb-16 w-full">
        {/* Page title */}
        <h2 className="font-headline text-[32px] sm:text-[40px] font-bold leading-tight tracking-wide">
          About The Record
        </h2>
        <p className="font-headline text-[12px] sm:text-[13px] font-semibold tracking-[0.05em] text-caption mt-1">
          Horace Mann&rsquo;s Weekly Newspaper Since 1903
        </p>
        <div className="mt-4 h-[2px] bg-rule" />

        {/* Staff section */}
        <section className="mt-12">
          <h3 className="font-headline text-[24px] sm:text-[28px] font-bold tracking-wide">
            Staff
          </h3>
          <div className="mt-2 h-px bg-rule" />

          <div className="mt-8 space-y-12">
            {ROLE_ORDER.map((role) => {
              const group = grouped[role];
              if (!group || group.length === 0) return null;
              return (
                <div key={role}>
                  <h4 className="font-headline text-[11px] font-semibold tracking-[0.12em] uppercase text-caption mb-4">
                    {ROLE_GROUP_TITLES[role] ?? role}
                  </h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                    {group.map((u) => {
                      const title = u.displayTitle ?? ROLE_LABELS[u.role] ?? u.role;
                      return (
                        <li key={u.id} className="flex items-baseline justify-between gap-3 border-b border-neutral-200 pb-2">
                          <Link
                            href={`/profile/${u.id}`}
                            className="font-headline text-[16px] font-semibold text-maroon hover:underline"
                          >
                            {u.name}
                          </Link>
                          <span className="font-headline text-[13px] italic text-caption text-right">
                            {title}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>

          {users.length === 0 && (
            <p className="mt-8 font-headline text-[15px] text-caption italic">
              No staff members listed yet.
            </p>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
