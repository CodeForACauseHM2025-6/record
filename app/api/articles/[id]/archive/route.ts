import { errorResponse } from "@/lib/errors";

export async function PATCH() {
  return errorResponse(
    "GONE",
    "Per-article archive is no longer supported. Remove the article from its group or unpublish the group.",
    410,
  );
}
