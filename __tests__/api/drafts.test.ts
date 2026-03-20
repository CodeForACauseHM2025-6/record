import { GET as listDrafts } from "@/app/api/drafts/route";
import { GET as getDraft } from "@/app/api/drafts/[id]/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    article: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn() },
  },
}));

jest.mock("@/lib/middleware/auth", () => ({
  checkRole: jest.fn(),
}));

import { prisma } from "@/lib/prisma";
import { checkRole } from "@/lib/middleware/auth";

const mockFindMany = prisma.article.findMany as jest.Mock;
const mockCount = prisma.article.count as jest.Mock;
const mockFindFirst = prisma.article.findFirst as jest.Mock;
const mockCheckRole = checkRole as jest.Mock;

const editorSession = {
  session: { user: { id: "1", role: "EDITOR", isAdmin: false } },
  error: undefined,
};

describe("GET /api/drafts", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns drafts for editors", async () => {
    mockCheckRole.mockResolvedValue(editorSession);
    mockFindMany.mockResolvedValue([{ id: "1", status: "DRAFT" }]);
    mockCount.mockResolvedValue(1);

    const req = new NextRequest("http://localhost/api/drafts");
    const res = await listDrafts(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });
});

describe("GET /api/drafts/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns single draft for editors", async () => {
    mockCheckRole.mockResolvedValue(editorSession);
    mockFindFirst.mockResolvedValue({ id: "1", status: "DRAFT", title: "Test" });

    const req = new NextRequest("http://localhost/api/drafts/1");
    const res = await getDraft(req, { params: { id: "1" } });

    expect(res.status).toBe(200);
  });
});
