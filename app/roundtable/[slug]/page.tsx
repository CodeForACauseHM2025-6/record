import { notFound } from "next/navigation";
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
  group: { status: string; publishedAt: Date | null } | null;
  sides: {
    id: string;
    label: string;
    order: number;
    authors: { user: { id: string; name: string; image: string | null } }[];
  }[];
  turns: { id: string; sideId: string; body: string; order: number }[];
}

interface SidebarItem {
  id: string;
  slug: string;
  prompt: string;
  group: { publishedAt: Date | null } | null;
  sides: {
    label: string;
    order: number;
    authors: { user: { id: string; name: string; image: string | null } }[];
  }[];
}

export default async function RoundTablePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [rt, archive] = await Promise.all([
    prisma.roundTable.findUnique({
      where: { slug },
      include: {
        group: { select: { status: true, publishedAt: true } },
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
    }) as unknown as Promise<RoundTableData | null>,
    prisma.roundTable.findMany({
      where: { group: { status: "PUBLISHED" }, slug: { not: slug } },
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
      },
    }) as unknown as Promise<SidebarItem[]>,
  ]);

  if (!rt || rt.group?.status !== "PUBLISHED") notFound();

  const introAuthors = rt.sides.flatMap((s, sideIdx) =>
    s.authors.map((a) => ({
      id: a.user.id,
      name: a.user.name,
      image: a.user.image,
      sideIndex: sideIdx,
    })),
  );

  return (
    <div className="min-h-screen flex flex-col bg-white font-body page-enter">
      <SubpageHeader pageLabel="Round Table" badge="Round Table" />

      <main className="max-w-[1280px] mx-auto px-4 sm:px-8 pt-12 pb-20 w-full flex-1">
        <RoundTableSpinIntro slug={rt.slug} authors={introAuthors} prompt={rt.prompt} />

        <div className="flex flex-col lg:flex-row gap-10 lg:gap-12">
          <div className="lg:flex-1 min-w-0">
            <RoundTableDisplay
              data={{ ...rt, publishedAt: rt.group.publishedAt }}
            />
          </div>
          <div className="lg:w-[300px] shrink-0 lg:sticky lg:top-6 lg:self-start">
            {archive.length > 0 && (
              <PastRoundTablesSidebar items={archive} currentSlug={rt.slug} />
            )}
            <IntroControls />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
