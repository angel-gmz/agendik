import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import type { TenantRole } from "@prisma/client";

export const SESSION_COOKIE_NAME = "agenteia_session";

const DEV_AUTH_SECRET = "dev-auth-secret-change-in-production-32chars!!";

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret || (process.env.NODE_ENV === "production" && secret === DEV_AUTH_SECRET)) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET debe estar configurado con un valor seguro en producción.");
    }
    return new TextEncoder().encode(DEV_AUTH_SECRET);
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  isSuperAdmin: boolean;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.userId !== "string" || typeof payload.email !== "string") {
      return null;
    }
    return {
      userId: payload.userId,
      email: payload.email,
      name: String(payload.name ?? ""),
      isSuperAdmin: Boolean(payload.isSuperAdmin),
    };
  } catch {
    return null;
  }
}

export function getCookieDomain(): string | undefined {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";
  const hostOnly = rootDomain.split(":")[0];
  if (hostOnly === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostOnly)) {
    return undefined;
  }
  return `.${hostOnly}`;
}

export async function setSessionCookie(payload: SessionPayload) {
  const token = await createSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    domain: getCookieDomain(),
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    domain: getCookieDomain(),
    maxAge: 0,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getCurrentUserWithTenants() {
  const session = await getSession();
  if (!session) return null;
  return prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      memberships: {
        include: {
          tenant: {
            include: { plan: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function requireTenantAccess(
  tenantSlug: string,
  allowedRoles?: TenantRole[]
) {
  const session = await getSession();
  if (!session) {
    throw new AuthError("No autenticado", 401);
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    include: { plan: true, agentConfig: true },
  });

  if (!tenant) {
    throw new AuthError("Tenant no encontrado", 404);
  }

  if (session.isSuperAdmin) {
    return { session, tenant, role: "OWNER" as TenantRole };
  }

  const membership = await prisma.tenantMembership.findUnique({
    where: {
      tenantId_userId: {
        tenantId: tenant.id,
        userId: session.userId,
      },
    },
  });

  if (!membership) {
    throw new AuthError("Sin acceso a este workspace", 403);
  }

  if (allowedRoles && !allowedRoles.includes(membership.role)) {
    throw new AuthError("Permisos insuficientes", 403);
  }

  return { session, tenant, role: membership.role };
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}
