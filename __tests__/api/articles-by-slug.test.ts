import { GET } from "@/app/api/articles/by-slug/[slug]/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    article: {
      findFirst: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockFindFirst = prisma.article.findFirst as jest.Mock;

const mockArticle = {
  id: "article-1",
  title: "Test Article",
  slug: "test-article",
  body: "<p>Content</p>",
  excerpt: "Test excerpt",
  featuredImage: null,
  section: "NEWS",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  createdById: "user-1",
  createdBy: { id: "user-1", name: "Editor", email: "editor@example.com", image: null },
  credits: [{ id: "credit-1", userId: "user-1", creditRole: "Author", user: { id: "user-1", name: "Editor", email: "editor@example.com", image: null } }],
  images: [],
};

describe("GET /api/articles/by-slug/[slug]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns article by slug", async () => {
    mockFindFirst.mockResolvedValue(mockArticle);

    const req = new NextRequest("http://localhost/api/articles/by-slug/test-article");
    const res = await GET(req, { params: Promise.resolve({ slug: "test-article" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.slug).toBe("test-article");
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: "test-article", group: { status: "PUBLISHED" } },
      })
    );
  });

  it("returns 404 when article not found", async () => {
    mockFindFirst.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/articles/by-slug/nonexistent");
    const res = await GET(req, { params: Promise.resolve({ slug: "nonexistent" }) });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("includes createdBy, credits with user, and images ordered by order", async () => {
    mockFindFirst.mockResolvedValue(mockArticle);

    const req = new NextRequest("http://localhost/api/articles/by-slug/test-article");
    await GET(req, { params: Promise.resolve({ slug: "test-article" }) });

    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          createdBy: true,
          credits: expect.objectContaining({
            include: { user: true },
          }),
          images: expect.objectContaining({
            orderBy: { order: "asc" },
          }),
        }),
      })
    );
  });
});
