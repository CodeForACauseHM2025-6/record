import { POST, DELETE } from "@/app/api/upload/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/middleware/auth", () => ({
  checkRole: jest.fn(),
}));

jest.mock("@/lib/s3", () => ({
  createPresignedUploadUrl: jest.fn(),
  deleteS3Object: jest.fn(),
}));

import { checkRole } from "@/lib/middleware/auth";
import { createPresignedUploadUrl, deleteS3Object } from "@/lib/s3";

const mockCheckRole = checkRole as jest.Mock;
const mockPresign = createPresignedUploadUrl as jest.Mock;
const mockDeleteS3 = deleteS3Object as jest.Mock;

const editorSession = {
  session: { user: { id: "1", role: "EDITOR", isAdmin: false } },
  error: undefined,
};

describe("POST /api/upload", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns presigned URL for valid request", async () => {
    mockCheckRole.mockResolvedValue(editorSession);
    mockPresign.mockResolvedValue("https://s3.example.com/presigned");

    const req = new NextRequest("http://localhost/api/upload", {
      method: "POST",
      body: JSON.stringify({
        filename: "photo.jpg",
        contentType: "image/jpeg",
        contentLength: 1024,
      }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.uploadUrl).toBe("https://s3.example.com/presigned");
    expect(body.key).toBeDefined();
  });

  it("rejects invalid content type", async () => {
    mockCheckRole.mockResolvedValue(editorSession);

    const req = new NextRequest("http://localhost/api/upload", {
      method: "POST",
      body: JSON.stringify({
        filename: "file.svg",
        contentType: "image/svg+xml",
        contentLength: 1024,
      }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/upload", () => {
  beforeEach(() => jest.clearAllMocks());

  it("deletes S3 object", async () => {
    mockCheckRole.mockResolvedValue(editorSession);
    mockDeleteS3.mockResolvedValue(undefined);

    const req = new NextRequest("http://localhost/api/upload", {
      method: "DELETE",
      body: JSON.stringify({ key: "uploads/photo.jpg" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await DELETE(req);

    expect(res.status).toBe(200);
    expect(mockDeleteS3).toHaveBeenCalledWith("uploads/photo.jpg");
  });
});
