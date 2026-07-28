import type { Metadata } from "next";
import { StatusPage } from "@/components/launch/StatusPage";

export const metadata: Metadata = {
  title: "Estado del sistema — ForgeOS",
  description: "Estado en tiempo real de los servicios ForgeOS.",
};

export default function StatusRoute() {
  return <StatusPage />;
}
