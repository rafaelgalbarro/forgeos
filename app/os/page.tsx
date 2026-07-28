import type { Metadata } from "next";
import { OsDesktop } from "@/components/os/OsDesktop";

export const metadata: Metadata = {
  title: "ForgeOS",
  description: "Sistema Operativo ForgeOS — RC2",
};

export default function OsHomePage() {
  return <OsDesktop />;
}
