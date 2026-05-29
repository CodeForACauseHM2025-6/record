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

import {
  addDirectoryAuthor,
  addManualAuthor,
  removeDirectoryAuthor,
} from "@/app/admin/author-actions";
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

const webTeam = { user: { id: "u1", role: "WEB_TEAM" } };

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue(webTeam);
});

describe("addDirectoryAuthor", () => {
  it("rejects non-horacemann emails", async () => {
    await expect(addDirectoryAuthor("x@gmail.com")).rejects.toThrow("@horacemann.org");
  });

  it("rejects a WRITER (now WEB_TEAM+ only)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "w", role: "WRITER" } });
    await expect(addDirectoryAuthor("x@horacemann.org")).rejects.toThrow("Web team access");
  });

  it("rejects a READER", async () => {
    mockAuth.mockResolvedValue({ user: { id: "r", role: "READER" } });
    await expect(addDirectoryAuthor("x@horacemann.org")).rejects.toThrow("Web team access");
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

describe("addManualAuthor", () => {
  it("rejects a WRITER (WEB_TEAM+ only)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "w", role: "WRITER" } });
    await expect(addManualAuthor({ name: "Guest" })).rejects.toThrow("Web team access");
  });

  it("rejects an empty name", async () => {
    await expect(addManualAuthor({ name: "   " })).rejects.toThrow("Name is required");
  });

  it("creates a placeholder with a synthetic email when none is given", async () => {
    mockUser.create.mockResolvedValue({ id: "m1", name: "Guest Writer" });
    const res = await addManualAuthor({ name: "Guest Writer" });
    expect(res).toEqual({ id: "m1", name: "Guest Writer" });
    expect(mockUser.findUnique).not.toHaveBeenCalled(); // no email → no dedup lookup
    const data = mockUser.create.mock.calls[0][0].data;
    expect(data).toEqual(
      expect.objectContaining({ isPlaceholder: true, role: "READER", name: "Guest Writer" }),
    );
    expect(String(data.email)).toMatch(/@manual\.invalid$/);
    expect(data.image).toBeNull();
  });

  it("dedups against an existing user when an email is provided", async () => {
    mockUser.findUnique.mockResolvedValue({ id: "existing", name: "Jane" });
    const res = await addManualAuthor({ name: "Jane", email: "Jane@horacemann.org" });
    expect(res).toEqual({ id: "existing", name: "Jane" });
    expect(mockUser.create).not.toHaveBeenCalled();
  });

  it("uses the provided email and photo when creating", async () => {
    mockUser.findUnique.mockResolvedValue(null);
    mockUser.create.mockResolvedValue({ id: "m2", name: "New Guest" });
    await addManualAuthor({
      name: "New Guest",
      email: "guest@horacemann.org",
      photoUrl: "https://pic",
    });
    expect(mockUser.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "guest@horacemann.org",
          image: "https://pic",
          isPlaceholder: true,
          role: "READER",
        }),
      }),
    );
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
