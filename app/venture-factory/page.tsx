import { VentureFactoryView } from "@/components/venture-factory/VentureFactoryView";

export const metadata = {
  title: "Venture Factory — ForgeOS",
  description: "RC7 — De idea a empresa completa (dry-run)",
};

export default function VentureFactoryPage() {
  return <VentureFactoryView showLabLink />;
}
