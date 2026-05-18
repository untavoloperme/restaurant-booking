import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    const adminOnlyPaths = [
      "/admin/users",
      "/admin/layout-editor",
      "/admin/menu",
      "/admin/settings",
    ];

    const isAdminOnly = adminOnlyPaths.some((p) => pathname.startsWith(p));
    if (isAdminOnly && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        if (pathname.startsWith("/api/public")) return true;
        if (pathname.startsWith("/api/auth")) return true;
        if (pathname.startsWith("/admin") || pathname.startsWith("/api/")) {
          return !!token;
        }
        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/api/((?!auth|public).*)"],
};
