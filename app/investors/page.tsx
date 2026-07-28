import type { Metadata } from "next";
import { InvestorsView } from "@/components/venture-intelligence/InvestorsView";

export const metadata: Metadata = {
  title: "Investors — ForgeOS",
  description: "Investor room y data room — RC8 Venture Intelligence",
};

export default function InvestorsPage() {
  return <InvestorsView />;
}
