import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgenteIA — Plataforma Multi-Tenant de Agentes IA para FAQs y Citas",
  description:
    "Crea tu agente de IA omnicanal con base de conocimiento RAG, agendamiento de citas, Google Calendar y traspaso a humanos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
