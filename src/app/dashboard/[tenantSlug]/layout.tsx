import { redirect } from "next/navigation";
import { getCurrentUserWithTenants, requireTenantAccess } from "@/lib/auth";
import DashboardShell from "@/components/DashboardShell";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  let access;
  try {
    access = await requireTenantAccess(tenantSlug);
  } catch {
    redirect("/login");
  }

  const user = await getCurrentUserWithTenants();
  if (!user) redirect("/login");

  const userTenants = user.memberships.map((m) => ({
    id: m.tenant.id,
    name: m.tenant.name,
    slug: m.tenant.slug,
    planCode: m.tenant.plan.code,
  }));

  if (!userTenants.some((t) => t.id === access.tenant.id)) {
    userTenants.unshift({
      id: access.tenant.id,
      name: access.tenant.name,
      slug: access.tenant.slug,
      planCode: access.tenant.plan.code,
    });
  }

  return (
    <DashboardShell
      currentTenant={{
        id: access.tenant.id,
        name: access.tenant.name,
        slug: access.tenant.slug,
        planCode: access.tenant.plan.code,
      }}
      userTenants={userTenants}
      userEmail={user.email}
      isSuperAdmin={user.isSuperAdmin}
    >
      {children}
    </DashboardShell>
  );
}
