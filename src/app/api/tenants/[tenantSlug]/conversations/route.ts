import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireTenantAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChannelType, ConversationStatus } from "@prisma/client";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await context.params;
    const { tenant } = await requireTenantAccess(tenantSlug);

    const channel = request.nextUrl.searchParams.get("channel") as ChannelType | null;
    const status = request.nextUrl.searchParams.get("status") as ConversationStatus | null;

    const conversations = await prisma.conversation.findMany({
      where: {
        tenantId: tenant.id,
        ...(channel && Object.values(ChannelType).includes(channel) ? { channel } : {}),
        ...(status && Object.values(ConversationStatus).includes(status) ? { status } : {}),
      },
      include: {
        contact: true,
        assignedUser: { select: { id: true, name: true, email: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: { select: { messages: true, appointments: true } },
      },
      orderBy: [{ needsHumanAttention: "desc" }, { lastMessageAt: "desc" }],
      take: 100,
    });

    return NextResponse.json({ conversations });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error listando conversaciones" }, { status: 500 });
  }
}
