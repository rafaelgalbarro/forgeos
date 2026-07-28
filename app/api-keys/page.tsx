import type { Metadata } from "next";
import { ApiKeysPanel } from "@/components/commercial/ApiKeysPanel";

export const metadata: Metadata = {
  title: "API Keys — ForgeOS",
  description: "Gestión de claves API para integraciones comerciales.",
};

export default function ApiKeysPage() {
  return <ApiKeysPanel />;
}
