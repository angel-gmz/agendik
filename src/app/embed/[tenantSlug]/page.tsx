import ChatWidgetClient from "@/components/ChatWidgetClient";

export default async function EmbedTenantChatPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  return <ChatWidgetClient tenantSlug={tenantSlug} embedded={true} />;
}
