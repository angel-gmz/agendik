import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const host = (request.nextUrl.searchParams.get("host") || "")
    .toLowerCase()
    .split(":")[0]
    .trim();

  if (!host) {
    return NextResponse.json({ slug: null });
  }

  const tenant = await prisma.tenant.findFirst({
    where: {
      customDomain: host,
      isActive: true,
    },
    select: { slug: true },
  });

  return NextResponse.json({ slug: tenant?.slug || null });
}
