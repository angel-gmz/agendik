export function extractSubdomain(host: string | null): string | null {
  if (!host) return null;
  const hostname = host.split(":")[0].toLowerCase();
  const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000")
    .split(":")[0]
    .toLowerCase();

  if (hostname === rootDomain || hostname === `www.${rootDomain}` || hostname === "127.0.0.1") {
    return null;
  }

  if (hostname.endsWith(`.${rootDomain}`)) {
    const sub = hostname.slice(0, -(rootDomain.length + 1));
    if (sub && sub !== "www" && !sub.includes(".")) {
      return sub;
    }
  }

  return null;
}
