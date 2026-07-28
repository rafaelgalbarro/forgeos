import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Founder Journey — ForgeOS",
  description: "Recorrido guiado del fundador: de la idea al lanzamiento.",
};

export default function FounderJourneyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
