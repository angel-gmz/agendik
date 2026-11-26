import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireTenantAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantUsageSummary } from "@/lib/usage";
import { AppointmentStatus, ConversationStatus } from "@prisma/client";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await context.params;
    const { tenant } = await requireTenantAccess(tenantSlug);

    const [
      usage,
      totalConversations,
      handoffConversations,
      resolvedConversations,
      upcomingAppointments,
      totalContacts,
      recentNeedsAttention,
      recentAppointments,
      faqCount,
      docCount,
      serviceCount,
    ] = await Promise.all([
      getTenantUsageSummary(tenant.id),
      prisma.conversation.count({ where: { tenantId: tenant.id } }),
      prisma.conversation.count({
        where: { tenantId: tenant.id, status: ConversationStatus.HUMAN_HANDOFF },
      }),
      prisma.conversation.count({
        where: { tenantId: tenant.id, status: ConversationStatus.RESOLVED },
      }),
      prisma.appointment.count({
        where: {
          tenantId: tenant.id,
          status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING] },
          startsAt: { gte: new Date() },
        },
      }),
      prisma.contact.count({ where: { tenantId: tenant.id } }),
      prisma.conversation.findMany({
        where: { tenantId: tenant.id, needsHumanAttention: true },
        include: {
          contact: true,
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { lastMessageAt: "desc" },
        take: 5,
      }),
      prisma.appointment.findMany({
        where: {
          tenantId: tenant.id,
          startsAt: { gte: new Date() },
          status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING] },
        },
        include: { contact: true, service: true },
        orderBy: { startsAt: "asc" },
        take: 6,
      }),
      prisma.faqItem.count({ where: { tenantId: tenant.id, isActive: true } }),
      prisma.knowledgeDocument.count({ where: { tenantId: tenant.id } }),
      prisma.service.count({ where: { tenantId: tenant.id, isActive: true } }),
    ]);

    const aiResolutionRate =
      totalConversations > 0
        ? Math.round(
            ((totalConversations - handoffConversations) / totalConversations) * 100
          )
        : 100;

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        timezone: tenant.timezone,
        primaryColor: tenant.primaryColor,
        plan: tenant.plan,
      },
      kpis: {
        totalConversations,
        handoffConversations,
        resolvedConversations,
        upcomingAppointments,
        totalContacts,
        aiResolutionRate,
      },
      usage,
      onboarding: {
        hasProfile: Boolean(tenant.description || tenant.phone || tenant.address),
        hasKnowledge: faqCount + docCount > 0,
        hasService: serviceCount > 0,
        hasTestedChat: totalConversations > 0,
      },
      recentNeedsAttention,
      recentAppointments,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error cargando resumen" }, { status: 500 });
  }
}
