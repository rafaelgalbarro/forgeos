import type { Metadata } from "next";
import { ExecutiveInsightsPanel } from "@/components/customer-success/ExecutiveInsightsPanel";

export const metadata: Metadata = {
  title: "Insights ejecutivos — ForgeOS",
  description: "Vista CEO: insights de customer success derivados de design partners.",
};

export default function ExecutiveInsightsRoute() {
  return <ExecutiveInsightsPanel />;
}
