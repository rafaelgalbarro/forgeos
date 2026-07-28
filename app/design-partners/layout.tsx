import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Design Partners — ForgeOS",
  description: "Dashboard para design partners — validación de hipótesis, feedback y métricas.",
};

export default function DesignPartnersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
