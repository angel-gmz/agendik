import { TenantRole } from "@prisma/client";
import { AuthError, getSession, requireTenantAccess } from "./auth";

export { AuthError };

export async function requireTenantRole(
  tenantSlug: string,
  allowedRoles: TenantRole[]
) {
  return requireTenantAccess(tenantSlug, allowedRoles);
}

export async function requireSuperAdmin() {
  const session = await getSession();
  if (!session) {
    throw new AuthError("No autenticado", 401);
  }
  if (!session.isSuperAdmin) {
    throw new AuthError("Acceso exclusivo para SuperAdmin", 403);
  }
  return session;
}
