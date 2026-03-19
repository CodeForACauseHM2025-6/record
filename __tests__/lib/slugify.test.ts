import { generateUniqueSlug } from "@/lib/slugify";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    article: {
      findFirst: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockFindFirst = prisma.article.findFirst as jest.Mock;

describe("generateUniqueSlug", () => {
  beforeEach(() => jest.clearAllMocks());

  it("generates a basic slug from title", async () => {
    mockFindFirst.mockResolvedValue(null);
    const slug = await generateUniqueSlug("Hello World");
    expect(slug).toBe("hello-world");
  });

  it("appends numeric suffix on collision", async () => {
    mockFindFirst
      .mockResolvedValueOnce({ id: "1" })
      .mockResolvedValueOnce(null);
    const slug = await generateUniqueSlug("Hello World");
    expect(slug).toBe("hello-world-2");
  });

  it("increments suffix until unique", async () => {
    mockFindFirst
      .mockResolvedValueOnce({ id: "1" })
      .mockResolvedValueOnce({ id: "2" })
      .mockResolvedValueOnce(null);
    const slug = await generateUniqueSlug("Hello World");
    expect(slug).toBe("hello-world-3");
  });
});
