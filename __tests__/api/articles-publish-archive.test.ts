import { PATCH as publishPatch } from "@/app/api/articles/[id]/publish/route";
import { PATCH as archivePatch } from "@/app/api/articles/[id]/archive/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    article: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/middleware/auth", () => ({
  checkRole: jest.fn(),
}));

import { prisma } from "@/lib/prisma";
import { checkRole } from "@/lib/middleware/auth";

const mockFindUnique = prisma.article.findUnique as jest.Mock;
const mockUpdate = prisma.article.update as jest.Mock;
const mockCheckRole = checkRole as jest.Mock;

const mockArticle = {
  id: "article-1",
  title: "Test Article",
  slug: "test-article",
  body: "<p>Content</p>",
  excerpt: null,
  featuredImage: null,
  section: "NEWS",
  status: "DRAFT",
  publishedAt: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  createdById: "user-1",
};

const editorSession = {
  session: { user: { id: "user-1", role: "EDITOR", isAdmin: false } },
  error: undefined,
};

const unauthorizedResult = {
  session: null,
  error: { status: 401, json: async () => ({ error: { code: "UNAUTHORIZED", message: "You must be signed in" } }) },
};

function makeRequest(url: string): NextRequest {
  return new NextRequest(url, { method: "PATCH" });
}

describe("PATCH /api/articles/[id]/publish", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockCheckRole.mockResolvedValue(unauthorizedResult);

    const req = makeRequest("http://localhost/api/articles/article-1/publish");
    const res = await publishPatch(req, { params: Promise.resolve({ id: "article-1" }) });
    expect(res.status).toBe(401);
  });

  it("publishes article for editor", async () => {
    mockCheckRole.mockResolvedValue(editorSession);
    mockFindUnique.mockResolvedValue(mockArticle);
    mockUpdate.mockResolvedValue({ ...mockArticle, status: "PUBLISHED", publishedAt: new Date() });

    const req = makeRequest("http://localhost/api/articles/article-1/publish");
    const res = await publishPatch(req, { params: Promise.resolve({ id: "article-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("PUBLISHED");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "article-1" },
        data: expect.objectContaining({
          status: "PUBLISHED",
          publishedAt: expect.any(Date),
        }),
      })
    );
  });

  it("returns 404 when article not found", async () => {
    mockCheckRole.mockResolvedValue(editorSession);
    mockFindUnique.mockResolvedValue(null);

    const req = makeRequest("http://localhost/api/articles/nonexistent/publish");
    const res = await publishPatch(req, { params: Promise.resolve({ id: "nonexistent" }) });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/articles/[id]/archive", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockCheckRole.mockResolvedValue(unauthorizedResult);

    const req = makeRequest("http://localhost/api/articles/article-1/archive");
    const res = await archivePatch(req, { params: Promise.resolve({ id: "article-1" }) });
    expect(res.status).toBe(401);
  });

  it("archives article for editor", async () => {
    mockCheckRole.mockResolvedValue(editorSession);
    mockFindUnique.mockResolvedValue(mockArticle);
    mockUpdate.mockResolvedValue({ ...mockArticle, status: "ARCHIVED" });

    const req = makeRequest("http://localhost/api/articles/article-1/archive");
    const res = await archivePatch(req, { params: Promise.resolve({ id: "article-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("ARCHIVED");
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "article-1" },
      data: { status: "ARCHIVED" },
    });
  });

  it("returns 404 when article not found", async () => {
    mockCheckRole.mockResolvedValue(editorSession);
    mockFindUnique.mockResolvedValue(null);

    const req = makeRequest("http://localhost/api/articles/nonexistent/archive");
    const res = await archivePatch(req, { params: Promise.resolve({ id: "nonexistent" }) });
    expect(res.status).toBe(404);
  });
});
