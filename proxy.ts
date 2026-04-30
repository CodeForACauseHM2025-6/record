import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

const publicLimiter = rateLimit({ maxRequests: 60, windowMs: 60000 });
const authLimiter = rateLimit({ maxRequests: 120, windowMs: 60000 });

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
const EDITOR_ROLES = ["EDITOR", "CHIEF_EDITOR", "WEB_TEAM", "WEB_MASTER"];
const ADMIN_ROLES = ["WEB_MASTER", "WEB_TEAM"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Rate limiting for API routes
  if (pathname.startsWith("/api") && !pathname.startsWith("/api/auth")) {
    const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    const limiter = req.auth?.user ? authLimiter : publicLimiter;
    if (!limiter.check(ip)) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "Too many requests" } },
        { status: 429 }
      );
    }
  }

  const role = req.auth?.user?.role;

  // Dashboard routes require a dashboard role (login enforced by layout too)
  if (pathname.startsWith("/dashboard")) {
    if (!req.auth?.user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (!role || !DASHBOARD_ROLES.includes(role)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // Group creation and settings require editor or above
  if (pathname.match(/^\/dashboard\/groups\/new/) || pathname.match(/^\/dashboard\/groups\/[^/]+\/settings/)) {
    if (!role || !EDITOR_ROLES.includes(role)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // Admin routes require web team
  if (pathname.startsWith("/admin")) {
    if (!req.auth?.user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (!role || !ADMIN_ROLES.includes(role)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
