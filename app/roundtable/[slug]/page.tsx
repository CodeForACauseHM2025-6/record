import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SubpageHeader } from "@/app/subpage-header";
import { Footer } from "@/app/footer";
import { RoundTableDisplay } from "@/app/roundtable/round-table-display";

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

export default async function RoundTablePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const rt = (await prisma.roundTable.findUnique({
    where: { slug },
    include: {
      group: { select: { status: true, publishedAt: true } },
      sides: {
        orderBy: { order: "asc" },
        include: { authors: { include: { user: { select: { id: true, name: true, image: true } } } } },
      },
      turns: { orderBy: { order: "asc" } },
    },
  })) as unknown as RoundTableData | null;

  if (!rt || rt.group?.status !== "PUBLISHED") notFound();

  return (
    <div className="min-h-screen flex flex-col bg-white font-body page-enter">
      <SubpageHeader pageLabel="Round Table" badge="Round Table" />

      <main className="max-w-[1100px] mx-auto px-4 sm:px-8 pt-12 pb-20 w-full">
        <RoundTableDisplay data={{ ...rt, publishedAt: rt.group.publishedAt }} />
      </main>
      <Footer />
    </div>
  );
}
