import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { errorResponse } from "@/lib/errors";
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

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ results: [] });

  try {
    const results = await searchDirectory(q);
    return NextResponse.json({ results });
  } catch (err) {
    console.error("[directory search] failed:", err);
    return errorResponse("DIRECTORY_ERROR", "Directory lookup failed", 502);
  }
}
