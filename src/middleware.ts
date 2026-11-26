import { NextRequest, NextResponse } from "next/server";
import { extractSubdomain } from "./lib/subdomain";

const domainCache = new Map<string, { slug: string | null; expiresAt: number }>();

async function resolveCustomDomainSlug(
  request: NextRequest,
  hostWithoutPort: string
): Promise<string | null> {
  const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000")
    .split(":")[0]
    .toLowerCase();

  if (
    !hostWithoutPort ||
    hostWithoutPort === "localhost" ||
    hostWithoutPort === "127.0.0.1" ||
    hostWithoutPort === rootDomain ||
    hostWithoutPort === `www.${rootDomain}` ||
    hostWithoutPort.endsWith(`.${rootDomain}`)
  ) {
    return null;
  }

  const cached = domainCache.get(hostWithoutPort);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.slug;
  }

  try {
    const res = await fetch(
      `${request.nextUrl.origin}/api/public/resolve-domain?host=${encodeURIComponent(hostWithoutPort)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { slug?: string | null };
    const slug = data.slug || null;
    domainCache.set(hostWithoutPort, { slug, expiresAt: Date.now() + 60_000 });
    return slug;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets and internal Next routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/widget.js") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const host = request.headers.get("host");
  const hostWithoutPort = (host || "").toLowerCase().split(":")[0];
  let tenantSlug = extractSubdomain(host);

  if (!tenantSlug) {
    tenantSlug = await resolveCustomDomainSlug(request, hostWithoutPort);
  }

  if (tenantSlug) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-tenant-slug", tenantSlug);

    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = `/chat/${tenantSlug}`;
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }

    if (pathname === "/admin" || pathname === "/panel") {
      const url = request.nextUrl.clone();
      url.pathname = `/dashboard/${tenantSlug}`;
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
