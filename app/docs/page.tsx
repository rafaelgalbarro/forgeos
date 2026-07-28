import type { Metadata } from "next";
import { DocsHub } from "@/components/launch/DocsHub";

export const metadata: Metadata = {
  title: "Documentación — ForgeOS 1.0",
  description: "Portal público de guías, quickstart, API y referencia de ForgeOS 1.0.",
};

export default function DocsRoute() {
  return <DocsHub />;
}
