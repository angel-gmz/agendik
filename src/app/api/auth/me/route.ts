import { NextResponse } from "next/server";
import { getCurrentUserWithTenants } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUserWithTenants();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
    },
    tenants: user.memberships.map((m) => ({
      id: m.tenant.id,
      name: m.tenant.name,
      slug: m.tenant.slug,
      role: m.role,
      plan: m.tenant.plan.code,
    })),
  });
}
