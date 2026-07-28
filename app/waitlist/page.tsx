import type { Metadata } from "next";
import { WaitlistPage } from "@/components/beta-platform/WaitlistPage";

export const metadata: Metadata = {
  title: "Waitlist — ForgeOS Beta",
  description: "Únete a la waitlist de la beta privada de ForgeOS.",
};

export default function WaitlistRoute() {
  return <WaitlistPage />;
}
