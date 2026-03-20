// Mock PrismaClient so lib/prisma.ts can be imported without a live DB connection.
// The functions under test (encryptFields, decryptResult, encryptWhereClause) are
// pure helpers that never touch the database.
jest.mock("@prisma/client", () => {
  const mockExtend = jest.fn().mockReturnThis();
  const MockPrismaClient = jest.fn().mockImplementation(() => ({
    $extends: mockExtend,
  }));
  return { PrismaClient: MockPrismaClient };
});

import { encrypt, decrypt, initEncryption, ENCRYPTED_FIELDS } from "@/lib/encryption";
import { encryptFields, decryptResult, encryptWhereClause } from "@/lib/prisma";
import { randomBytes } from "crypto";

const TEST_KEY = randomBytes(32).toString("hex");

beforeAll(() => {
  initEncryption(TEST_KEY);
});

describe("encryptFields", () => {
  it("encrypts matching fields in data object", () => {
    const data = { email: "test@horacemann.org", name: "Test User", role: "READER" };
    const result = encryptFields("User", data);
    expect(result.email).toMatch(/^enc:v1:/);
    expect(result.name).toMatch(/^enc:v1:/);
    expect(result.role).toBe("READER"); // not encrypted
  });

  it("skips null values", () => {
    const data = { email: "test@horacemann.org", image: null };
    const result = encryptFields("User", data);
    expect(result.email).toMatch(/^enc:v1:/);
    expect(result.image).toBeNull();
  });

  it("handles nested create (credits)", () => {
    const data = {
      title: "Test",
      body: "<p>Content</p>",
      credits: {
        create: [{ userId: "123", creditRole: "Writer" }],
      },
    };
    const result = encryptFields("Article", data);
    expect(result.body).toMatch(/^enc:v1:/);
    expect(result.title).toBe("Test"); // not encrypted
  });
});

describe("decryptResult", () => {
  it("decrypts encrypted string fields in result", () => {
    const encrypted = encrypt("Test User", "random");
    const result = { id: "1", name: encrypted, role: "READER" };
    const decrypted = decryptResult(result);
    expect(decrypted.name).toBe("Test User");
    expect(decrypted.role).toBe("READER");
  });

  it("handles arrays", () => {
    const encrypted = encrypt("Test", "random");
    const result = [{ name: encrypted }, { name: encrypt("Other", "random") }];
    const decrypted = decryptResult(result);
    expect(decrypted[0].name).toBe("Test");
    expect(decrypted[1].name).toBe("Other");
  });

  it("handles nested objects", () => {
    const result = {
      id: "1",
      credits: [{ user: { name: encrypt("Alice", "random") } }],
    };
    const decrypted = decryptResult(result);
    expect(decrypted.credits[0].user.name).toBe("Alice");
  });

  it("passes through null and non-objects", () => {
    expect(decryptResult(null)).toBeNull();
    expect(decryptResult(42)).toBe(42);
  });
});

describe("encryptWhereClause", () => {
  it("encrypts deterministic fields in where", () => {
    const where = { email: "test@horacemann.org" };
    const result = encryptWhereClause("User", where);
    expect(result.email).toMatch(/^enc:v1:/);
    expect(decrypt(result.email as string)).toBe("test@horacemann.org");
  });

  it("does not encrypt non-deterministic fields", () => {
    const where = { name: "Test" };
    const result = encryptWhereClause("User", where);
    expect(result.name).toBe("Test");
  });

  it("does not encrypt non-encrypted fields", () => {
    const where = { role: "EDITOR", isAdmin: true };
    const result = encryptWhereClause("User", where);
    expect(result.role).toBe("EDITOR");
    expect(result.isAdmin).toBe(true);
  });

  it("handles equals operator", () => {
    const where = { email: { equals: "test@horacemann.org" } };
    const result = encryptWhereClause("User", where);
    const emailOp = result.email as Record<string, unknown>;
    expect(emailOp.equals).toMatch(/^enc:v1:/);
  });

  it("handles OR clauses", () => {
    const where = { OR: [{ email: "a@horacemann.org" }, { email: "b@horacemann.org" }] };
    const result = encryptWhereClause("User", where);
    const orClauses = result.OR as Record<string, unknown>[];
    expect(orClauses[0].email).toMatch(/^enc:v1:/);
    expect(orClauses[1].email).toMatch(/^enc:v1:/);
  });

  it("handles compound unique keys", () => {
    const where = {
      articleId_userId_creditRole: {
        articleId: "a1",
        userId: "u1",
        creditRole: "Writer",
      },
    };
    const result = encryptWhereClause("ArticleCredit", where);
    const compound = result.articleId_userId_creditRole as Record<string, unknown>;
    expect(compound.creditRole).toMatch(/^enc:v1:/);
    expect(compound.articleId).toBe("a1"); // not encrypted
  });
});
