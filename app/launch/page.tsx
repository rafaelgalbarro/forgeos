import type { Metadata } from "next";
import { LaunchHub } from "@/components/launch/LaunchHub";

export const metadata: Metadata = {
  title: "ForgeOS 1.0 — Launch Hub",
  description: "Hub central del lanzamiento oficial ForgeOS 1.0 — producto, marketing y docs.",
};

export default function LaunchRoute() {
  return <LaunchHub />;
}
