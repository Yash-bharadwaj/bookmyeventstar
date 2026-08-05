import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "./session";

// Fully public content pages that never redirect based on auth state —
// skip token verification entirely for these. The three metadata routes
// (robots.ts, sitemap.ts, opengraph-image.tsx) have no file extension, so
// they don't match the middleware matcher's static-asset regex exclusion
// below the way favicon.ico/icon.png/apple-icon.png do — without listing
// them here explicitly, crawlers and social-share link previews fetching
// them got silently redirected to /login instead of the actual content.
const PUBLIC_NO_AUTH_CHECK = ["/", "/enquiry", "/forgot-password", "/robots.txt", "/sitemap.xml", "/opengraph-image"];

// Admin/coordinator-generated share links (/share/{token}) — meant to be
// opened by an external enquirer who isn't logged in at all, so they must
// bypass the auth gate below same as the other public pages. Distinct from
// the old public artist directory: the token is opaque and revocable, not a
// browsable listing (see isPublicArtistsRoute below).
function isPublicShareRoute(pathname: string): boolean {
  return pathname === "/share" || pathname.startsWith("/share/");
}

function isPublicNoAuthCheck(pathname: string): boolean {
  return pathname.startsWith("/api/") || PUBLIC_NO_AUTH_CHECK.includes(pathname) || isPublicShareRoute(pathname);
}

// The artist roster and individual profiles are no longer public — anyone
// could otherwise find a verified artist here and reach out directly,
// bypassing the platform entirely. Coordinators/admins use their own
// dedicated /coordinator/artists and /admin/artists tools instead, so
// /artists* has no legitimate audience left; send everyone (including
// crawlers and old shared profile links) to raise an enquiry instead.
function isPublicArtistsRoute(pathname: string): boolean {
  return pathname === "/artists" || pathname.startsWith("/artists/");
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

  if (isPublicArtistsRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/enquiry";
    url.search = "";
    return NextResponse.redirect(url);
  }

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
