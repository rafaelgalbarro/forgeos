import type { Metadata } from "next";
import { NpsDashboard } from "@/components/customer-success/NpsDashboard";

export const metadata: Metadata = {
  title: "NPS — ForgeOS",
  description: "Net Promoter Score y encuestas de satisfacción.",
};

export default function NpsRoute() {
  return <NpsDashboard />;
}
