import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "./session";

// Fully public content pages that never redirect based on auth state —
// skip token verification entirely for these. `/artists` (roster + individual
// profiles) is here on purpose: both are in sitemap.xml with daily-priority
// indexing and have full OG/Twitter/JSON-LD metadata for sharing (an artist
// sending a client their profile link, or a search engine crawler, has no
// session cookie) — gating them behind login silently broke both, since
// every unauthenticated visitor (including crawlers) was bounced to /login
// instead of ever seeing the actual content.
const PUBLIC_NO_AUTH_CHECK = ["/", "/enquiry", "/forgot-password", "/artists"];

function isPublicNoAuthCheck(pathname: string): boolean {
  return pathname.startsWith("/api/") || pathname.startsWith("/artists/") || PUBLIC_NO_AUTH_CHECK.includes(pathname);
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
