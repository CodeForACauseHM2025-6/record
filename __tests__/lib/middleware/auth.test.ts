import { checkRole, checkAdmin, checkAuth } from "@/lib/middleware/auth";

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

import { auth } from "@/lib/auth";

const mockAuth = auth as jest.Mock;

describe("checkRole", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns null for unauthenticated users", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await checkRole("EDITOR");
    expect(result.session).toBeNull();
    expect(result.error).toBeDefined();
  });

  it("returns error for insufficient role", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", role: "READER", isAdmin: false },
    });
    const result = await checkRole("EDITOR");
    expect(result.error).toBeDefined();
  });

  it("returns session for editors", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", role: "EDITOR", isAdmin: false },
    });
    const result = await checkRole("EDITOR");
    expect(result.session).toBeDefined();
    expect(result.error).toBeUndefined();
  });

  it("allows admins regardless of role", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", role: "READER", isAdmin: true },
    });
    const result = await checkRole("EDITOR");
    expect(result.session).toBeDefined();
    expect(result.error).toBeUndefined();
  });
});

describe("checkAuth", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns error for unauthenticated users", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await checkAuth();
    expect(result.session).toBeNull();
    expect(result.error).toBeDefined();
  });

  it("returns session for any authenticated user", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", role: "READER", isAdmin: false },
    });
    const result = await checkAuth();
    expect(result.session).toBeDefined();
    expect(result.error).toBeUndefined();
  });
});

describe("checkAdmin", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns error for non-admin", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", role: "EDITOR", isAdmin: false },
    });
    const result = await checkAdmin();
    expect(result.error).toBeDefined();
  });

  it("returns session for admin", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", role: "EDITOR", isAdmin: true },
    });
    const result = await checkAdmin();
    expect(result.session).toBeDefined();
  });
});
