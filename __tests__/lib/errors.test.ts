import { errorResponse } from "@/lib/errors";

describe("errorResponse", () => {
  it("returns a Response with correct status and body", async () => {
    const res = errorResponse("NOT_FOUND", "Article not found", 404);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({
      error: { code: "NOT_FOUND", message: "Article not found" },
    });
  });

  it("defaults to 400 status", async () => {
    const res = errorResponse("BAD_REQUEST", "Invalid input");
    expect(res.status).toBe(400);
  });
});
