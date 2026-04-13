import type { Metadata } from "next";
import "./globals.css";
import { ClientProvider } from "@/lib/ClientContext";

export const metadata: Metadata = {
  title: "Ecommerce Dashboard",
  description: "Central dashboard for Amazon & Mercado Libre accounts",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <ClientProvider>{children}</ClientProvider>
      </body>
    </html>
  );
}
