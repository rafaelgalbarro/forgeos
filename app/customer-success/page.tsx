import type { Metadata } from "next";
import { CustomerSuccessCenter } from "@/components/customer-success/CustomerSuccessCenter";

export const metadata: Metadata = {
  title: "Customer Success — ForgeOS",
  description: "Centro de customer success: NPS, retención, activación y salud de partners.",
};

export default function CustomerSuccessRoute() {
  return <CustomerSuccessCenter />;
}
