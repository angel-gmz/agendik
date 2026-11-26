"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Search, Users } from "lucide-react";

interface ContactRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  whatsappId: string | null;
  instagramId: string | null;
  messengerId: string | null;
  notes: string | null;
  _count: { conversations: number; appointments: number };
}

export default function ContactsPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch(`/api/tenants/${tenantSlug}/contacts`)
      .then((r) => r.json())
      .then((d) => setContacts(d.contacts || []));
  }, [tenantSlug]);

  const filtered = contacts.filter((c) => {
    if (!q.trim()) return true;
    const hay = `${c.name || ""} ${c.email || ""} ${c.phone || ""}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Directorio de Contactos / Leads</h1>
          <p className="text-sm text-slate-500">
            Todos los clientes capturados desde Web, WhatsApp, Instagram y Messenger
          </p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar contacto..."
            className="rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Contacto</th>
              <th className="px-4 py-3">Email / Teléfono</th>
              <th className="px-4 py-3">Canales</th>
              <th className="px-4 py-3 text-center">Chats</th>
              <th className="px-4 py-3 text-center">Citas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  <Users className="mx-auto mb-2 h-5 w-5" />
                  No se encontraron contactos.
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {c.name || "Visitante"}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    <div>{c.email || "—"}</div>
                    <div>{c.phone || "—"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 text-[10px] font-bold">
                      {c.whatsappId && (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-700">
                          WA
                        </span>
                      )}
                      {c.instagramId && (
                        <span className="rounded bg-pink-100 px-1.5 py-0.5 text-pink-700">
                          IG
                        </span>
                      )}
                      {c.messengerId && (
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-700">
                          FB
                        </span>
                      )}
                      {!c.whatsappId && !c.instagramId && !c.messengerId && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">
                          WEB
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-medium text-slate-700">
                    {c._count.conversations}
                  </td>
                  <td className="px-4 py-3 text-center font-medium text-indigo-700">
                    {c._count.appointments}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
