import { withAuth } from "next-auth/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SA_SESSION_COOKIE = "sa-session";

async function verifySaCookie(token: string): Promise<boolean> {
  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
    const { payload } = await jwtVerify(token, secret, { issuer: "sa" });
    return payload.type === "sa-session";
  } catch {
    return false;
  }
}

async function backstageMiddleware(req: NextRequest): Promise<NextResponse | null> {
  const pathname = req.nextUrl.pathname;
  if (!pathname.startsWith("/backstage")) return null;

  // Pagine pubbliche del backstage (non richiedono SA session)
  const isPublic =
    pathname === "/backstage/login" ||
    pathname === "/backstage/2fa";

  if (isPublic) return NextResponse.next();

  const token = req.cookies.get(SA_SESSION_COOKIE)?.value;
  if (!token || !(await verifySaCookie(token))) {
    return NextResponse.redirect(new URL("/backstage/login", req.url));
  }
  return NextResponse.next();
}

export default withAuth(
  async function middleware(req) {
    // ── 1. Gestione backstage (SA session) ───────────────
    const bsRes = await backstageMiddleware(req);
    if (bsRes) return bsRes;

    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Aggiungi x-pathname per i Server Components
    const res = NextResponse.next();
    res.headers.set("x-pathname", pathname);

    // ── 2. Blocco pendingTotp ─────────────────────────────
    if (token?.pendingTotp) {
      if (!pathname.startsWith("/login/2fa") && !pathname.startsWith("/api/auth")) {
        return NextResponse.redirect(new URL("/login/2fa", req.url));
      }
      return res;
    }

    // ── 3. KITCHEN ────────────────────────────────────────
    if (token?.role === "KITCHEN") {
      const kitchenAllowed = ["/admin/kitchen", "/admin/floor"];
      const isAllowed = kitchenAllowed.some((p) => pathname.startsWith(p));
      if (!isAllowed && pathname.startsWith("/admin")) {
        return NextResponse.redirect(new URL("/admin/kitchen", req.url));
      }
      return res;
    }

    // ── 4. Solo KITCHEN per /admin/kitchen ────────────────
    if (pathname.startsWith("/admin/kitchen") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    // ── 5. Solo ADMIN ─────────────────────────────────────
    const adminOnlyPaths = [
      "/admin/users",
      "/admin/layout-editor",
      "/admin/menu",
      "/admin/settings",
      "/admin/stats",
    ];
    const isAdminOnly = adminOnlyPaths.some((p) => pathname.startsWith(p));
    if (isAdminOnly && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    return res;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        // Il backstage usa la propria SA session — NextAuth non deve intervenire
        if (pathname.startsWith("/backstage")) return true;
        if (pathname.startsWith("/api/backstage")) return true;
        if (pathname.startsWith("/api/public")) return true;
        if (pathname.startsWith("/api/auth")) return true;
        if (pathname.startsWith("/menu")) return true;
        if (pathname.startsWith("/login")) return true;
        if (pathname.startsWith("/admin") || pathname.startsWith("/api/")) {
          return !!token;
        }
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/((?!auth|public).*)",
    "/login/2fa",
    "/backstage/:path*",
  ],
};
