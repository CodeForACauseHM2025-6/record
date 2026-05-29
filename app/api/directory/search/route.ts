import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { errorResponse } from "@/lib/errors";
import { directorySearchSchema } from "@/lib/validations";
import { isDirectoryConfigured, searchDirectory } from "@/lib/google-directory";

const DASHBOARD_ROLES = [
  "WRITER",
  "DESIGNER",
  "PHOTOGRAPHER",
  "ART_TEAM",
  "EDITOR",
  "CHIEF_EDITOR",
  "WEB_TEAM",
  "WEB_MASTER",
];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return errorResponse("UNAUTHORIZED", "Sign in required", 401);
  if (!DASHBOARD_ROLES.includes(session.user.role)) {
    return errorResponse("FORBIDDEN", "Dashboard access required", 403);
  }

  if (!isDirectoryConfigured()) {
    return errorResponse("DIRECTORY_UNCONFIGURED", "Directory lookup is not configured", 503);
  }

  const raw = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!raw) return NextResponse.json({ results: [] });

  // Validate (and length-cap at 100) via the shared Zod schema before it reaches the Google API.
  const parsed = directorySearchSchema.safeParse({ q: raw });
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid query", 400);
  }

  try {
    const results = await searchDirectory(parsed.data.q);
    return NextResponse.json({ results });
  } catch (err) {
    console.error("[directory search] failed:", err);
    return errorResponse("DIRECTORY_ERROR", "Directory lookup failed", 502);
  }
}
