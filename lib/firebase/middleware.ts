import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "./session";

// Fully public content pages that never redirect based on auth state —
// skip token verification entirely for these. `/artists` is deliberately
// NOT here: every action in this app requires signing in first, including
// browsing the artist roster, so it goes through the normal login redirect
// like every other page below.
const PUBLIC_NO_AUTH_CHECK = ["/", "/enquiry", "/forgot-password"];

function isPublicNoAuthCheck(pathname: string): boolean {
  return pathname.startsWith("/api/") || PUBLIC_NO_AUTH_CHECK.includes(pathname);
}

// Central role gate. Previously each dashboard page individually checked
// `user.role !== "admin"` etc. and redirected — correct everywhere it was
// done, but a single missed page (or a new one added without copying the
// check) was silently unprotected. This enforces the same rule for every
// request in one place; the per-page checks are left in as defense in depth.
const ROLE_SECTIONS = ["admin", "artist", "coordinator", "client"] as const;

function roleForPath(pathname: string): (typeof ROLE_SECTIONS)[number] | null {
  for (const role of ROLE_SECTIONS) {
    if (pathname === `/${role}` || pathname.startsWith(`/${role}/`)) return role;
  }
  return null;
}

// Only ever redirect back to a same-origin app path — never let a
// `redirect` param carry a protocol-relative or absolute URL off-site.
function safeRedirectTarget(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicNoAuthCheck(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const decoded = token ? await verifySessionToken(token) : null;

  const isLoginOrRegister = pathname === "/login" || pathname === "/register";

  if (!decoded && !isLoginOrRegister) {
    const url = request.nextUrl.clone();
    const target = pathname + request.nextUrl.search;
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("redirect", target);
    return NextResponse.redirect(url);
  }

  if (decoded && isLoginOrRegister) {
    const target = safeRedirectTarget(request.nextUrl.searchParams.get("redirect"));
    const url = new URL(target ?? `/${decoded.role}`, request.url);
    return NextResponse.redirect(url);
  }

  const requiredRole = roleForPath(pathname);
  if (decoded && requiredRole && decoded.role !== requiredRole) {
    const url = request.nextUrl.clone();
    url.pathname = `/${decoded.role}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
