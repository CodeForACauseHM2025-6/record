import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SubpageHeader } from "@/app/subpage-header";
import { Footer } from "@/app/footer";
import { RoundTableDisplay } from "@/app/roundtable/round-table-display";

interface RoundTableData {
  id: string;
  slug: string;
  prompt: string;
  status: string;
  publishedAt: Date | null;
  sides: {
    id: string;
    label: string;
    order: number;
    authors: { user: { id: string; name: string } }[];
  }[];
  turns: { id: string; sideId: string; body: string; order: number }[];
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function RoundTableIndexPage() {
  const published = (await prisma.roundTable.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    include: {
      sides: {
        orderBy: { order: "asc" },
        include: { authors: { include: { user: { select: { id: true, name: true } } } } },
      },
      turns: { orderBy: { order: "asc" } },
    },
  })) as unknown as RoundTableData[];

  const latest = published[0] ?? null;
  const archive = published.slice(1);

  return (
    <div className="min-h-screen flex flex-col bg-white font-body page-enter">
      <SubpageHeader pageLabel="Round Table" badge="Round Table" />

      <main className="max-w-[1100px] mx-auto px-4 sm:px-8 pt-12 pb-20 w-full">
        {latest ? (
          <>
            <RoundTableDisplay data={latest} />

            {archive.length > 0 && (
              <section className="mt-24 max-w-[820px] mx-auto">
                <h3 className="font-headline text-[11px] font-semibold tracking-[0.16em] uppercase text-caption">
                  Previous Round Tables
                </h3>
                <div className="mt-4 h-px bg-rule" />
                <ul className="mt-4 divide-y divide-neutral-200">
                  {archive.map((rt) => (
                    <li key={rt.id} className="py-4">
                      <Link
                        href={`/roundtable/${rt.slug}`}
                        className="block group"
                      >
                        <p className="font-headline text-[18px] font-bold leading-snug group-hover:text-maroon transition-colors">
                          {rt.prompt}
                        </p>
                        <p className="mt-1 font-headline text-[12px] text-caption">
                          {rt.publishedAt && formatDateShort(rt.publishedAt)}
                          {rt.publishedAt && " · "}
                          {rt.sides
                            .map((s) =>
                              s.authors.map((a) => a.user.name).join(", ") || "(no authors)"
                            )
                            .join("  vs  ")}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        ) : (
          <div className="text-center py-24">
            <p className="font-headline text-[11px] font-semibold tracking-[0.18em] uppercase text-maroon">
              The Round Table
            </p>
            <h1 className="mt-3 font-headline text-[28px] sm:text-[34px] font-bold tracking-wide">
              No round tables published yet.
            </h1>
            <p className="mt-3 font-headline text-[15px] text-caption">
              Check back next week.
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
