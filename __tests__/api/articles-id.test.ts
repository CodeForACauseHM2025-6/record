import { GET, PATCH, DELETE } from "@/app/api/articles/[id]/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    article: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    articleCredit: {
      deleteMany: jest.fn(),
    },
    articleImage: {
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/middleware/auth", () => ({
  checkRole: jest.fn(),
}));

jest.mock("@/lib/sanitize", () => ({
  sanitizeHtml: jest.fn((html: string) => html),
}));

import { prisma } from "@/lib/prisma";
import { checkRole } from "@/lib/middleware/auth";
import { sanitizeHtml } from "@/lib/sanitize";

const mockFindUnique = prisma.article.findUnique as jest.Mock;
const mockUpdate = prisma.article.update as jest.Mock;
const mockDelete = prisma.article.delete as jest.Mock;
const mockDeleteManyCredits = prisma.articleCredit.deleteMany as jest.Mock;
const mockDeleteManyImages = prisma.articleImage.deleteMany as jest.Mock;
const mockCheckRole = checkRole as jest.Mock;
const mockSanitizeHtml = sanitizeHtml as jest.Mock;

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
  credits: [],
  images: [],
};

const editorSession = {
  session: { user: { id: "user-1", role: "EDITOR", isAdmin: false } },
  error: undefined,
};

const unauthorizedResult = {
  session: null,
  error: { status: 401, json: async () => ({ error: { code: "UNAUTHORIZED", message: "You must be signed in" } }) },
};

function makeRequest(method: string, body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/articles/article-1", {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("GET /api/articles/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockCheckRole.mockResolvedValue(unauthorizedResult);

    const req = makeRequest("GET");
    const res = await GET(req, { params: Promise.resolve({ id: "article-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns article for editor", async () => {
    mockCheckRole.mockResolvedValue(editorSession);
    mockFindUnique.mockResolvedValue(mockArticle);

    const req = makeRequest("GET");
    const res = await GET(req, { params: Promise.resolve({ id: "article-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.id).toBe("article-1");
    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "article-1" } })
    );
  });

  it("returns 404 when article not found", async () => {
    mockCheckRole.mockResolvedValue(editorSession);
    mockFindUnique.mockResolvedValue(null);

    const req = makeRequest("GET");
    const res = await GET(req, { params: Promise.resolve({ id: "nonexistent" }) });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/articles/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockCheckRole.mockResolvedValue(unauthorizedResult);

    const req = makeRequest("PATCH", { title: "Updated" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "article-1" }) });
    expect(res.status).toBe(401);
  });

  it("updates article for editor", async () => {
    mockCheckRole.mockResolvedValue(editorSession);
    mockFindUnique.mockResolvedValue(mockArticle);
    mockSanitizeHtml.mockReturnValue("<p>Updated</p>");
    mockUpdate.mockResolvedValue({ ...mockArticle, title: "Updated Title" });

    const req = makeRequest("PATCH", { title: "Updated Title", body: "<p>Updated</p>" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "article-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.title).toBe("Updated Title");
  });

  it("returns 404 when article not found", async () => {
    mockCheckRole.mockResolvedValue(editorSession);
    mockFindUnique.mockResolvedValue(null);

    const req = makeRequest("PATCH", { title: "Updated" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "nonexistent" }) });
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid data", async () => {
    mockCheckRole.mockResolvedValue(editorSession);
    mockFindUnique.mockResolvedValue(mockArticle);

    const req = makeRequest("PATCH", { title: "" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "article-1" }) });
    expect(res.status).toBe(400);
  });

  it("replaces credits when provided", async () => {
    mockCheckRole.mockResolvedValue(editorSession);
    mockFindUnique.mockResolvedValue(mockArticle);
    mockDeleteManyCredits.mockResolvedValue({ count: 0 });
    mockUpdate.mockResolvedValue(mockArticle);

    const req = makeRequest("PATCH", {
      credits: [{ userId: "550e8400-e29b-41d4-a716-446655440000", creditRole: "Photographer" }],
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "article-1" }) });

    expect(res.status).toBe(200);
    expect(mockDeleteManyCredits).toHaveBeenCalledWith({ where: { articleId: "article-1" } });
  });

  it("replaces images when provided", async () => {
    mockCheckRole.mockResolvedValue(editorSession);
    mockFindUnique.mockResolvedValue(mockArticle);
    mockDeleteManyImages.mockResolvedValue({ count: 0 });
    mockUpdate.mockResolvedValue(mockArticle);

    const req = makeRequest("PATCH", {
      images: [{ url: "https://example.com/img.jpg", altText: "An image", order: 0 }],
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "article-1" }) });

    expect(res.status).toBe(200);
    expect(mockDeleteManyImages).toHaveBeenCalledWith({ where: { articleId: "article-1" } });
  });

  it("sanitizes body on update", async () => {
    mockCheckRole.mockResolvedValue(editorSession);
    mockFindUnique.mockResolvedValue(mockArticle);
    mockSanitizeHtml.mockReturnValue("<p>Safe</p>");
    mockUpdate.mockResolvedValue(mockArticle);

    const req = makeRequest("PATCH", { body: "<script>xss</script><p>Safe</p>" });
    await PATCH(req, { params: Promise.resolve({ id: "article-1" }) });

    expect(mockSanitizeHtml).toHaveBeenCalledWith("<script>xss</script><p>Safe</p>");
  });
});

describe("DELETE /api/articles/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockCheckRole.mockResolvedValue(unauthorizedResult);

    const req = makeRequest("DELETE");
    const res = await DELETE(req, { params: Promise.resolve({ id: "article-1" }) });
    expect(res.status).toBe(401);
  });

  it("deletes article for editor", async () => {
    mockCheckRole.mockResolvedValue(editorSession);
    mockFindUnique.mockResolvedValue(mockArticle);
    mockDelete.mockResolvedValue(mockArticle);

    const req = makeRequest("DELETE");
    const res = await DELETE(req, { params: Promise.resolve({ id: "article-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toBeDefined();
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "article-1" } });
  });

  it("returns 404 when article not found", async () => {
    mockCheckRole.mockResolvedValue(editorSession);
    mockFindUnique.mockResolvedValue(null);

    const req = makeRequest("DELETE");
    const res = await DELETE(req, { params: Promise.resolve({ id: "nonexistent" }) });
    expect(res.status).toBe(404);
  });
});
