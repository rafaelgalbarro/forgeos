import type { Metadata } from "next";
import { SupportHub } from "@/components/beta-platform/SupportHub";

export const metadata: Metadata = {
  title: "Soporte — ForgeOS 1.0",
  description: "Centro de ayuda, waitlist, invitaciones y soporte para el lanzamiento.",
};

export default function SupportRoute() {
  return <SupportHub />;
}
