import { permanentRedirect } from "next/navigation";

export const metadata = {
  title: "Broker",
  description: "Redirects to ForgeOS Investment Orders.",
};

/** Broker terminal lives under Orders in the primary product IA. */
export default function InvestmentBrokerLegacyRedirect() {
  permanentRedirect("/investment/orders");
}
