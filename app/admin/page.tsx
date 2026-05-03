import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateShort } from "@/lib/article-helpers";

export default async function AdminOverviewPage() {
  const [
    totalUsers,
    totalArticles,
    totalGroups,
    publishedGroups,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.article.count(),
    prisma.articleGroup.count(),
    prisma.articleGroup.count({ where: { status: "PUBLISHED" } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true, name: true, email: true, role: true, createdAt: true,
        encryptedDek: true, dekKekVersion: true,
        emailCiphertext: true, nameCiphertext: true,
      },
    }),
  ]);

  return (
    <div>
      <h1 className="font-headline text-[30px] sm:text-[36px] font-bold tracking-wide">
        Overview
      </h1>
      <div className="mt-2 h-[2px] bg-rule" />

      {/* Stats */}
      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Users" value={totalUsers} />
        <StatCard label="Articles" value={totalArticles} />
        <StatCard label="Editions" value={totalGroups} />
        <StatCard label="Published Editions" value={publishedGroups} />
      </div>

      {/* Recently joined */}
      <section className="mt-12">
        <div className="flex items-end justify-between">
          <h2 className="font-headline text-[20px] font-bold tracking-wide">
            Recently Joined
          </h2>
          <Link
            href="/admin/users"
            className="font-headline text-[13px] text-maroon hover:underline"
          >
            View all users &rarr;
          </Link>
        </div>
        <div className="mt-3 h-px bg-rule" />

        <ul className="mt-2 divide-y divide-neutral-200">
          {recentUsers.map((u: (typeof recentUsers)[number]) => (
            <li key={u.id} className="py-3 flex items-baseline justify-between gap-4">
              <div className="min-w-0">
                <Link
                  href={`/admin/users/${u.id}`}
                  className="font-headline font-bold text-[16px] hover:text-maroon"
                >
                  {u.name}
                </Link>
                <p className="font-headline text-[13px] text-caption truncate">
                  {u.email}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-headline text-[12px] tracking-[0.08em] uppercase text-caption">
                  {u.role.replace("_", " ")}
                </p>
                <p className="font-headline text-[12px] text-caption">
                  Joined {formatDateShort(u.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-ink/10 px-5 py-4">
      <p className="font-headline text-[12px] tracking-[0.1em] uppercase text-caption">
        {label}
      </p>
      <p className="font-masthead text-[36px] leading-none mt-1">{value}</p>
    </div>
  );
}
