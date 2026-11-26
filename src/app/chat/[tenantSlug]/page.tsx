import ChatWidgetClient from "@/components/ChatWidgetClient";

export default async function PublicTenantChatPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  return (
    <div className="min-h-[100dvh] bg-slate-100 sm:px-4 sm:py-6">
      <ChatWidgetClient tenantSlug={tenantSlug} embedded={false} />
    </div>
  );
}
