import type { Metadata } from "next";
import { LandingPage } from "@/components/launch/LandingPage";

export const metadata: Metadata = {
  title: "ForgeOS — AI Venture Studio",
  description: "El sistema operativo para crear ventures con IA. Beta privada RC12.",
};

export default function LandingRoute() {
  return <LandingPage />;
}
