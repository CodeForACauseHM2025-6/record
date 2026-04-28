import { prisma } from "@/lib/prisma";
import { SubpageHeader } from "@/app/subpage-header";
import { RoundTableDisplay } from "@/app/roundtable/round-table-display";

interface RoundTableData {
  id: string;
  slug: string;
  prompt: string;
  group: { publishedAt: Date | null } | null;
  sides: {
    id: string;
    label: string;
    order: number;
    authors: { user: { id: string; name: string; image: string | null } }[];
  }[];
  turns: { id: string; sideId: string; body: string; order: number }[];
}

export default async function RoundTableIndexPage() {
  const latest = (await prisma.roundTable.findFirst({
    where: { group: { status: "PUBLISHED" } },
    orderBy: [{ group: { publishedAt: "desc" } }, { updatedAt: "desc" }],
    include: {
      group: { select: { publishedAt: true } },
      sides: {
        orderBy: { order: "asc" },
        include: { authors: { include: { user: { select: { id: true, name: true, image: true } } } } },
      },
      turns: { orderBy: { order: "asc" } },
    },
  })) as unknown as RoundTableData | null;

  return (
    <div className="h-[100dvh] flex flex-col bg-white font-body page-enter overflow-hidden">
      <SubpageHeader pageLabel="Round Table" badge="Round Table" />

      <main className="flex-1 min-h-0 w-full">
        {latest ? (
          <RoundTableDisplay data={{ ...latest, publishedAt: latest.group?.publishedAt ?? null }} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
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
    </div>
  );
}
