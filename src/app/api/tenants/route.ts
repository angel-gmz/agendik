import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createTenantWithDefaults } from "@/lib/tenant";

const createTenantSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  timezone: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createTenantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const tenant = await createTenantWithDefaults({
      name: parsed.data.name,
      slug: parsed.data.slug,
      ownerUserId: session.userId,
      timezone: parsed.data.timezone,
      email: session.email,
    });

    return NextResponse.json({ tenant });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error creando workspace" },
      { status: 400 }
    );
  }
}
