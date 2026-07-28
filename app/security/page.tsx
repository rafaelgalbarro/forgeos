import type { Metadata } from "next";
import { SecurityPage } from "@/components/launch/SecurityPage";

export const metadata: Metadata = {
  title: "Seguridad — ForgeOS",
  description: "Prácticas de seguridad de ForgeOS en RC12.",
};

export default function SecurityRoute() {
  return <SecurityPage />;
}
