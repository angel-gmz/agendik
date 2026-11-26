"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Calendar, Clock, Plus, Trash2, Check, X, Ban } from "lucide-react";

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

interface Service {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  currency: string;
  isActive: boolean;
}

interface AvailabilityRule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface AvailabilityException {
  id: string;
  date: string;
  isBlocked: boolean;
  reason: string | null;
}

interface Appointment {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  notes: string | null;
  googleEventId: string | null;
  contact: { name: string | null; email: string | null; phone: string | null };
  service: { name: string; durationMinutes: number };
}

export default function AppointmentsPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [tab, setTab] = useState<"appointments" | "services" | "availability">("appointments");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);
  const [msg, setMsg] = useState("");

  // New Service form
  const [svcName, setSvcName] = useState("");
  const [svcDuration, setSvcDuration] = useState(30);
  const [svcPrice, setSvcPrice] = useState(0);

  // New Manual Appointment form
  const [apptServiceId, setApptServiceId] = useState("");
  const [apptDate, setApptDate] = useState("");
  const [apptName, setApptName] = useState("");
  const [apptEmail, setApptEmail] = useState("");
  const [apptPhone, setApptPhone] = useState("");

  // New blocked date
  const [blockDate, setBlockDate] = useState("");
  const [blockReason, setBlockReason] = useState("");

  const loadData = useCallback(async () => {
    const res = await fetch(`/api/tenants/${tenantSlug}/appointments`);
    if (res.ok) {
      const data = await res.json();
      setAppointments(data.appointments || []);
      setServices((data.services || []).filter((s: Service) => s.isActive));
      setRules(data.availabilityRules || []);
      setExceptions(data.exceptions || []);
      if (!apptServiceId && data.services?.length > 0) {
        setApptServiceId(data.services[0].id);
      }
    }
  }, [tenantSlug, apptServiceId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function createManualAppt(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const res = await fetch(`/api/tenants/${tenantSlug}/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: apptServiceId,
        startsAt: new Date(apptDate).toISOString(),
        contactName: apptName,
        contactEmail: apptEmail,
        contactPhone: apptPhone,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "No se pudo crear la cita");
    } else {
      setApptName("");
      setApptEmail("");
      setApptPhone("");
      setApptDate("");
      setMsg("Cita creada correctamente");
      loadData();
    }
  }

  async function updateApptStatus(appointmentId: string, actionOrStatus: string) {
    const payload =
      actionOrStatus === "CANCELLED"
        ? { appointmentId, action: "cancel" }
        : { appointmentId, status: actionOrStatus };
    await fetch(`/api/tenants/${tenantSlug}/appointments`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    loadData();
  }

  async function createService(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/tenants/${tenantSlug}/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "service",
        name: svcName,
        durationMinutes: svcDuration,
        price: svcPrice,
      }),
    });
    setSvcName("");
    setSvcPrice(0);
    loadData();
  }

  async function saveRules() {
    await fetch(`/api/tenants/${tenantSlug}/appointments`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availabilityRules: rules }),
    });
    setMsg("Horarios semanales guardados.");
  }

  async function addBlockedDate(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/tenants/${tenantSlug}/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "exception",
        date: blockDate,
        isBlocked: true,
        reason: blockReason || "Día no laboral",
      }),
    });
    setBlockDate("");
    setBlockReason("");
    loadData();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agenda, Servicios y Horarios</h1>
          <p className="text-sm text-slate-500">
            Administra citas agendadas por la IA o manualmente, servicios y disponibilidad
          </p>
        </div>
        <div className="flex gap-2">
          {[
            { id: "appointments", label: "Citas" },
            { id: "services", label: "Servicios" },
            { id: "availability", label: "Horarios y Bloqueos" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as typeof tab)}
              className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                tab === t.id
                  ? "bg-indigo-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {msg && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm text-indigo-800">
          {msg}
        </div>
      )}

      {tab === "appointments" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            {appointments.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
                Aún no hay citas registradas.
              </div>
            ) : (
              appointments.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-indigo-600" />
                      <span className="font-bold text-slate-900">{a.service.name}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          a.status === "CONFIRMED"
                            ? "bg-emerald-100 text-emerald-700"
                            : a.status === "CANCELLED"
                            ? "bg-red-100 text-red-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {a.status}
                      </span>
                      {a.googleEventId && (
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                          Google Sync
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      {new Date(a.startsAt).toLocaleString("es-MX", {
                        dateStyle: "full",
                        timeStyle: "short",
                      })}{" "}
                      ({a.service.durationMinutes} min)
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {a.contact.name || "Cliente"} · {a.contact.email || "Sin email"} ·{" "}
                      {a.contact.phone || "Sin tel"}
                    </div>
                  </div>
                  {a.status !== "CANCELLED" && (
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateApptStatus(a.id, "COMPLETED")}
                        title="Marcar completada"
                        className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateApptStatus(a.id, "CANCELLED")}
                        title="Cancelar cita"
                        className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-700 hover:bg-red-100"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Manual booking form */}
          <form
            onSubmit={createManualAppt}
            className="h-fit space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-base font-bold text-slate-900">Agendar cita manual</h2>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Servicio</label>
              <select
                value={apptServiceId}
                onChange={(e) => setApptServiceId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.durationMinutes} min)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Fecha y hora</label>
              <input
                type="datetime-local"
                required
                value={apptDate}
                onChange={(e) => setApptDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <input
              type="text"
              required
              placeholder="Nombre del cliente"
              value={apptName}
              onChange={(e) => setApptName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="email"
              placeholder="Correo electrónico"
              value={apptEmail}
              onChange={(e) => setApptEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Teléfono"
              value={apptPhone}
              onChange={(e) => setApptPhone(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" /> Guardar cita
            </button>
          </form>
        </div>
      )}

      {tab === "services" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            {services.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div>
                  <div className="font-bold text-slate-900">{s.name}</div>
                  <div className="text-xs text-slate-500">
                    {s.durationMinutes} min ·{" "}
                    {s.priceCents > 0
                      ? `$${(s.priceCents / 100).toFixed(2)} ${s.currency}`
                      : "Gratis / A cotizar"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await fetch(
                      `/api/tenants/${tenantSlug}/appointments?kind=service&id=${s.id}`,
                      { method: "DELETE" }
                    );
                    loadData();
                  }}
                  className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <form
            onSubmit={createService}
            className="h-fit space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-base font-bold text-slate-900">Nuevo servicio</h2>
            <input
              type="text"
              required
              placeholder="Ej. Limpieza Dental"
              value={svcName}
              onChange={(e) => setSvcName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-500">Duración (min)</label>
                <input
                  type="number"
                  min={10}
                  step={5}
                  value={svcDuration}
                  onChange={(e) => setSvcDuration(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Precio (MXN)</label>
                <input
                  type="number"
                  min={0}
                  value={svcPrice}
                  onChange={(e) => setSvcPrice(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Agregar servicio
            </button>
          </form>
        </div>
      )}

      {tab === "availability" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
              <Clock className="h-4 w-4 text-indigo-600" /> Horario semanal
            </h2>
            <div className="space-y-2.5">
              {rules.map((r, idx) => (
                <div key={r.dayOfWeek} className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={r.isActive}
                    onChange={(e) => {
                      const next = [...rules];
                      next[idx] = { ...r, isActive: e.target.checked };
                      setRules(next);
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                  />
                  <span className="w-24 font-medium text-slate-700">{DAYS[r.dayOfWeek]}</span>
                  <input
                    type="time"
                    value={r.startTime}
                    disabled={!r.isActive}
                    onChange={(e) => {
                      const next = [...rules];
                      next[idx] = { ...r, startTime: e.target.value };
                      setRules(next);
                    }}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs disabled:opacity-40"
                  />
                  <span className="text-slate-400">a</span>
                  <input
                    type="time"
                    value={r.endTime}
                    disabled={!r.isActive}
                    onChange={(e) => {
                      const next = [...rules];
                      next[idx] = { ...r, endTime: e.target.value };
                      setRules(next);
                    }}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs disabled:opacity-40"
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={saveRules}
              className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Guardar horarios
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
              <Ban className="h-4 w-4 text-red-500" /> Días bloqueados / festivos
            </h2>
            <form onSubmit={addBlockedDate} className="mb-4 flex flex-wrap gap-2">
              <input
                type="date"
                required
                value={blockDate}
                onChange={(e) => setBlockDate(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
              <input
                type="text"
                placeholder="Motivo (ej. Festivo)"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Bloquear
              </button>
            </form>
            <div className="space-y-2">
              {exceptions.map((ex) => (
                <div
                  key={ex.id}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                >
                  <span>
                    <strong>{ex.date}</strong> — {ex.reason || "Bloqueado"}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch(
                        `/api/tenants/${tenantSlug}/appointments?kind=exception&id=${ex.id}`,
                        { method: "DELETE" }
                      );
                      loadData();
                    }}
                    className="text-slate-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
