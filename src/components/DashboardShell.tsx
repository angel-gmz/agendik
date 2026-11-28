"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  Calendar,
  BookOpen,
  Bot,
  Share2,
  Users,
  UserCog,
  ShieldAlert,
  CreditCard,
  ExternalLink,
  LogOut,
  Building2,
} from "lucide-react";

interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  planCode: string;
}

export default function DashboardShell({
  currentTenant,
  userTenants,
  userEmail,
  isSuperAdmin = false,
  children,
}: {
  currentTenant: TenantSummary;
  userTenants: TenantSummary[];
  userEmail: string;
  isSuperAdmin?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/dashboard/${currentTenant.slug}`;

  const navItems = [
    { href: base, label: "Resumen y Analíticas", icon: LayoutDashboard, exact: true },
    { href: `${base}/inbox`, label: "Inbox Omnicanal", icon: MessageSquare },
    { href: `${base}/appointments`, label: "Citas y Horarios", icon: Calendar },
    { href: `${base}/knowledge`, label: "FAQs y Documentos", icon: BookOpen },
    { href: `${base}/agent`, label: "Agente IA y Negocio", icon: Bot },
    { href: `${base}/channels`, label: "Canales y Alertas", icon: Share2 },
    { href: `${base}/contacts`, label: "Contactos / Leads", icon: Users },
    { href: `${base}/team`, label: "Equipo y Roles", icon: UserCog },
    { href: `${base}/billing`, label: "Plan y Facturación", icon: CreditCard },
  ];

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-slate-900">Atendik</div>
            <div className="truncate text-[11px] font-medium text-indigo-600">
              Plan {currentTenant.planCode}
            </div>
          </div>
        </div>

        {/* Workspace Switcher */}
        <div className="border-b border-slate-100 p-3">
          <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <Building2 className="h-3 w-3" /> Workspace
          </label>
          <select
            value={currentTenant.slug}
            onChange={(e) => router.push(`/dashboard/${e.target.value}`)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:outline-none"
          >
            {userTenants.map((t) => (
              <option key={t.id} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom links */}
        <div className="space-y-2 border-t border-slate-100 p-3">
          {isSuperAdmin && (
            <Link
              href="/superadmin"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              Panel SuperAdmin
            </Link>
          )}
          <Link
            href={`/chat/${currentTenant.slug}`}
            target="_blank"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50/70 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Abrir Chat Público
          </Link>
          <div className="flex items-center justify-between px-1 pt-1">
            <span className="truncate text-xs text-slate-500">{userEmail}</span>
            <button
              type="button"
              onClick={handleLogout}
              title="Cerrar sesión"
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top nav */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <span className="font-bold text-slate-900">{currentTenant.name}</span>
          <div className="flex items-center gap-2 overflow-x-auto">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                {item.label.split(" ")[0]}
              </Link>
            ))}
          </div>
        </header>

        <main className="flex-1 p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
