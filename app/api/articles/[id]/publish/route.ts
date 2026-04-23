import { errorResponse } from "@/lib/errors";

export async function PATCH() {
  return errorResponse(
    "GONE",
    "Per-article publish is no longer supported. Publish the parent group instead.",
    410,
  );
}
