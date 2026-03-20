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

  // Dashboard routes require EDITOR role or isAdmin
  if (pathname.startsWith("/dashboard")) {
    if (!req.auth?.user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (req.auth.user.role !== "EDITOR" && !req.auth.user.isAdmin) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // Admin routes require isAdmin
  if (pathname.startsWith("/admin")) {
    if (!req.auth?.user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (!req.auth.user.isAdmin) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // Profile routes require authentication
  if (pathname.startsWith("/profile")) {
    if (!req.auth?.user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*", "/admin/:path*", "/profile/:path*"],
};
