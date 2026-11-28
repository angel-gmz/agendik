import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atendik | Recepcionista con IA para clínicas, consultorios y spas en México",
  description:
    "Responde dudas frecuentes y agenda citas 24/7 en Google Calendar por WhatsApp, Instagram, Messenger y tu sitio web. Empieza gratis en MXN.",
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
