import { PATCH as updateRole } from "@/app/api/users/[id]/role/route";
import { PATCH as updateAdmin } from "@/app/api/users/[id]/admin/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn(), update: jest.fn() },
  },
}));

jest.mock("@/lib/middleware/auth", () => ({
  checkAdmin: jest.fn(),
}));

import { prisma } from "@/lib/prisma";
import { checkAdmin } from "@/lib/middleware/auth";

const mockFindUnique = prisma.user.findUnique as jest.Mock;
const mockUpdate = prisma.user.update as jest.Mock;
const mockCheckAdmin = checkAdmin as jest.Mock;

const adminSession = {
  session: { user: { id: "admin-1", isAdmin: true } },
  error: undefined,
};

describe("PATCH /api/users/[id]/role", () => {
  beforeEach(() => jest.clearAllMocks());

  it("updates user role", async () => {
    mockCheckAdmin.mockResolvedValue(adminSession);
    mockFindUnique.mockResolvedValue({ id: "user-1", role: "READER" });
    mockUpdate.mockResolvedValue({ id: "user-1", role: "EDITOR" });

    const req = new NextRequest("http://localhost/api/users/user-1/role", {
      method: "PATCH",
      body: JSON.stringify({ role: "EDITOR" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await updateRole(req, { params: { id: "user-1" } });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.role).toBe("EDITOR");
  });
});

describe("PATCH /api/users/[id]/admin", () => {
  beforeEach(() => jest.clearAllMocks());

  it("toggles admin status", async () => {
    mockCheckAdmin.mockResolvedValue(adminSession);
    mockFindUnique.mockResolvedValue({ id: "user-1", isAdmin: false });
    mockUpdate.mockResolvedValue({ id: "user-1", isAdmin: true });

    const req = new NextRequest("http://localhost/api/users/user-1/admin", {
      method: "PATCH",
      body: JSON.stringify({ isAdmin: true }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await updateAdmin(req, { params: { id: "user-1" } });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isAdmin).toBe(true);
  });

  it("prevents admin from toggling their own admin status", async () => {
    mockCheckAdmin.mockResolvedValue(adminSession);

    const req = new NextRequest("http://localhost/api/users/admin-1/admin", {
      method: "PATCH",
      body: JSON.stringify({ isAdmin: false }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await updateAdmin(req, { params: { id: "admin-1" } });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toContain("your own");
  });
});
