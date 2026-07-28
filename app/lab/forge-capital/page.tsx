import type { Metadata } from "next";
import { ForgeCapitalLabView } from "@/components/venture-intelligence/ForgeCapitalLabView";

export const metadata: Metadata = {
  title: "Forge Capital Lab — ForgeOS",
  description: "RC8 — lab de departamentos AI de capital",
};

export default function ForgeCapitalLabPage() {
  return <ForgeCapitalLabView />;
}
