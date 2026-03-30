import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

const publicLimiter = rateLimit({ maxRequests: 60, windowMs: 60000 });
const authLimiter = rateLimit({ maxRequests: 120, windowMs: 60000 });

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

  // All non-API, non-login pages require authentication
  if (!pathname.startsWith("/api") && pathname !== "/login") {
    if (!req.auth?.user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // Dashboard routes require WRITER or above
  if (pathname.startsWith("/dashboard")) {
    const role = req.auth?.user?.role;
    const dashboardRoles = ["WRITER", "DESIGNER", "EDITOR", "WEB_TEAM", "WEB_MASTER"];
    if (!role || !dashboardRoles.includes(role)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // Group creation and settings require WEB_MASTER
  if (pathname.match(/^\/dashboard\/groups\/new/) || pathname.match(/^\/dashboard\/groups\/[^/]+\/settings/)) {
    if (req.auth?.user?.role !== "WEB_MASTER") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // Admin routes require WEB_MASTER
  if (pathname.startsWith("/admin")) {
    if (req.auth?.user?.role !== "WEB_MASTER") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
});

export const runtime = "nodejs";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
