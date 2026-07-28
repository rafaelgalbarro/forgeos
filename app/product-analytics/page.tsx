import type { Metadata } from "next";
import { ProductAnalyticsDashboard } from "@/components/customer-success/ProductAnalyticsDashboard";

export const metadata: Metadata = {
  title: "Analytics de producto — ForgeOS",
  description: "Métricas de producto, sesiones, embudos y uso de IA.",
};

export default function ProductAnalyticsRoute() {
  return <ProductAnalyticsDashboard />;
}
