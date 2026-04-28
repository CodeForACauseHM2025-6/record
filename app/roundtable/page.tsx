import { prisma } from "@/lib/prisma";
import { SubpageHeader } from "@/app/subpage-header";
import { Footer } from "@/app/footer";
import { RoundTableDisplay } from "@/app/roundtable/round-table-display";
import { RoundTableSpinIntro } from "@/app/roundtable/round-table-spin-intro";
import { PastRoundTablesSidebar } from "@/app/roundtable/past-roundtables-sidebar";
import { IntroControls } from "@/app/roundtable/intro-controls";

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
  const published = (await prisma.roundTable.findMany({
    where: { group: { status: "PUBLISHED" } },
    orderBy: [{ group: { publishedAt: "desc" } }, { updatedAt: "desc" }],
    include: {
      group: { select: { publishedAt: true } },
      sides: {
        orderBy: { order: "asc" },
        include: {
          authors: {
            include: { user: { select: { id: true, name: true, image: true } } },
          },
        },
      },
      turns: { orderBy: { order: "asc" } },
    },
  })) as unknown as RoundTableData[];

  const latest = published[0] ?? null;
  const archive = published.slice(1);

  const introAuthors = latest
    ? latest.sides.flatMap((s, sideIdx) =>
        s.authors.map((a) => ({
          id: a.user.id,
          name: a.user.name,
          image: a.user.image,
          sideIndex: sideIdx,
        })),
      )
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-white font-body page-enter">
      <SubpageHeader pageLabel="Round Table" badge="Round Table" />

      <main className="max-w-[1280px] mx-auto px-4 sm:px-8 pt-12 pb-20 w-full flex-1">
        {latest ? (
          <>
            <RoundTableSpinIntro
              slug={latest.slug}
              authors={introAuthors}
              prompt={latest.prompt}
            />

            <div className="flex flex-col lg:flex-row gap-10 lg:gap-12">
              <div className="lg:flex-1 min-w-0">
                <RoundTableDisplay
                  data={{ ...latest, publishedAt: latest.group?.publishedAt ?? null }}
                />
              </div>
              <div className="lg:w-[300px] shrink-0 lg:sticky lg:top-6 lg:self-start">
                {archive.length > 0 && (
                  <PastRoundTablesSidebar items={archive} currentSlug={latest.slug} />
                )}
                <IntroControls />
              </div>
            </div>
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
