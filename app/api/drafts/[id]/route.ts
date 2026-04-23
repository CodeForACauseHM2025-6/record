import { errorResponse } from "@/lib/errors";

export async function GET() {
  return errorResponse(
    "GONE",
    "Articles no longer have their own status. Fetch the article directly via /api/articles/[id] — visibility depends on the parent group's status.",
    410,
  );
}
