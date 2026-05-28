jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/google-directory", () => ({ getDirectoryUserByEmail: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/prisma", () => {
  const user = {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  };
  return {
    prisma: {
      user,
      // removeDirectoryAuthor runs its check+delete inside $transaction; invoke the callback with
      // a tx client that shares the same user mocks.
      $transaction: jest.fn(async (cb: (tx: { user: typeof user }) => unknown) => cb({ user })),
    },
  };
});

import { addDirectoryAuthor, removeDirectoryAuthor } from "@/app/dashboard/author-actions";
import { auth } from "@/lib/auth";
import { getDirectoryUserByEmail } from "@/lib/google-directory";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as unknown as jest.Mock;
const mockGetDir = getDirectoryUserByEmail as jest.Mock;
const mockUser = prisma.user as unknown as {
  findUnique: jest.Mock;
  create: jest.Mock;
  delete: jest.Mock;
};

const writer = { user: { id: "u1", role: "WRITER" } };

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue(writer);
});

describe("addDirectoryAuthor", () => {
  it("rejects non-horacemann emails", async () => {
    await expect(addDirectoryAuthor("x@gmail.com")).rejects.toThrow("@horacemann.org");
  });

  it("rejects when not a dashboard role", async () => {
    mockAuth.mockResolvedValue({ user: { id: "r", role: "READER" } });
    await expect(addDirectoryAuthor("x@horacemann.org")).rejects.toThrow("Dashboard access");
  });

  it("returns the existing user without creating a duplicate", async () => {
    mockUser.findUnique.mockResolvedValue({ id: "existing", name: "Jane" });
    const res = await addDirectoryAuthor("jane@horacemann.org");
    expect(res).toEqual({ id: "existing", name: "Jane" });
    expect(mockUser.create).not.toHaveBeenCalled();
    expect(mockGetDir).not.toHaveBeenCalled();
  });

  it("creates a placeholder when none exists", async () => {
    mockUser.findUnique.mockResolvedValue(null);
    mockGetDir.mockResolvedValue({
      email: "new@horacemann.org",
      name: "New Person",
      photoUrl: "https://p",
    });
    mockUser.create.mockResolvedValue({ id: "created", name: "New Person" });

    const res = await addDirectoryAuthor("New@horacemann.org");
    expect(res).toEqual({ id: "created", name: "New Person" });
    expect(mockUser.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isPlaceholder: true, role: "READER", name: "New Person" }),
      }),
    );
  });

  it("throws when directory has no match", async () => {
    mockUser.findUnique.mockResolvedValue(null);
    mockGetDir.mockResolvedValue(null);
    await expect(addDirectoryAuthor("ghost@horacemann.org")).rejects.toThrow("No matching directory");
  });
});

describe("removeDirectoryAuthor", () => {
  it("refuses a claimed user", async () => {
    mockUser.findUnique.mockResolvedValue({
      isPlaceholder: false,
      _count: { articles: 0, articleCredits: 0 },
    });
    await expect(removeDirectoryAuthor("u")).rejects.toThrow("cannot be removed");
    expect(mockUser.delete).not.toHaveBeenCalled();
  });

  it("refuses a credited placeholder", async () => {
    mockUser.findUnique.mockResolvedValue({
      isPlaceholder: true,
      _count: { articles: 0, articleCredits: 2 },
    });
    await expect(removeDirectoryAuthor("u")).rejects.toThrow("credited on articles");
    expect(mockUser.delete).not.toHaveBeenCalled();
  });

  it("deletes an uncredited placeholder", async () => {
    mockUser.findUnique.mockResolvedValue({
      isPlaceholder: true,
      _count: { articles: 0, articleCredits: 0 },
    });
    await removeDirectoryAuthor("u");
    expect(mockUser.delete).toHaveBeenCalledWith({ where: { id: "u" } });
  });
});
