import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SA_SESSION_COOKIE = "sa-session";
const SA_PENDING_COOKIE = "sa-pending";

function getSecret() {
  return new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
}

/* ── Token di sessione completa (8h) ─────────────────── */

export async function signSaSession(saId: string): Promise<string> {
  return new SignJWT({ sub: saId, type: "sa-session" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .setIssuer("sa")
    .sign(getSecret());
}

export async function verifySaSession(token: string): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { issuer: "sa" });
    if (payload.type !== "sa-session") return null;
    return { sub: payload.sub as string };
  } catch {
    return null;
  }
}

/* ── Token pending 2FA (5 min) ───────────────────────── */

export async function signSaPending(saId: string): Promise<string> {
  return new SignJWT({ sub: saId, type: "sa-pending" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .setIssuer("sa")
    .sign(getSecret());
}

export async function verifySaPending(token: string): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { issuer: "sa" });
    if (payload.type !== "sa-pending") return null;
    return { sub: payload.sub as string };
  } catch {
    return null;
  }
}

/* ── Helpers cookie (usabili solo in Server Components / Route Handlers) ── */

const isSecure = process.env.NODE_ENV === "production";

export async function setSaSessionCookie(saId: string) {
  const token = await signSaSession(saId);
  cookies().set(SA_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
}

export async function setSaPendingCookie(saId: string) {
  const token = await signSaPending(saId);
  cookies().set(SA_PENDING_COOKIE, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 5 * 60,
  });
}

export function clearSaCookies() {
  cookies().delete(SA_SESSION_COOKIE);
  cookies().delete(SA_PENDING_COOKIE);
}

/* ── Legge la sessione SA corrente (Server Component / Route Handler) ── */

export async function getSaSession(): Promise<{ id: string } | null> {
  const token = cookies().get(SA_SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySaSession(token);
  if (!payload) return null;
  return { id: payload.sub };
}

export async function getSaPendingId(): Promise<string | null> {
  const token = cookies().get(SA_PENDING_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySaPending(token);
  return payload?.sub ?? null;
}
