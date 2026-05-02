import { prisma } from "@/lib/prisma";

export async function getSiteVolumeAndIssue(): Promise<{
  volumeNumber: number | null;
  issueNumber: number | null;
}> {
  const latest = await prisma.articleGroup.findFirst({
    where: { status: "PUBLISHED" },
    orderBy: [{ volumeNumber: "desc" }, { issueNumber: "desc" }],
    select: { volumeNumber: true, issueNumber: true },
  });

  return {
    volumeNumber: latest?.volumeNumber ?? null,
    issueNumber: latest?.issueNumber ?? null,
  };
}
