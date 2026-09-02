import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { AuthProvider } from "@/components/auth/AuthProvider";
import "./globals.css";
import "@/styles/investment/terminal-theme.css";
import "@/styles/fhis/tokens.css";
import "@/styles/fhis/components.css";
import "@/styles/fhis/os.css";
import "@/styles/fhis/mission-control.css";
import "@/styles/fhis/company-command-center.css";
import "@/styles/fhis/portfolio-command-center.css";

export const metadata: Metadata = {
  title: "ForgeOS — AI Venture Studio",
  description: "Convierte ideas en empresas digitales completas con IA."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
