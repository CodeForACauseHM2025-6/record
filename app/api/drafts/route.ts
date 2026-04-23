import { errorResponse } from "@/lib/errors";

export async function GET() {
  return errorResponse(
    "GONE",
    "Articles no longer have their own status — 'draft' is derived from the owning group. Query /api/articles with a group filter instead.",
    410,
  );
}
