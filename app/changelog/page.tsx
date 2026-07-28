import type { Metadata } from "next";
import { ChangelogPage } from "@/components/launch/ChangelogPage";

export const metadata: Metadata = {
  title: "Changelog — ForgeOS",
  description: "Historial de versiones y novedades de ForgeOS.",
};

export default function ChangelogRoute() {
  return <ChangelogPage />;
}
