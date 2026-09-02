import { permanentRedirect } from "next/navigation";

export const metadata = {
  title: "Strategy Center",
  description: "Redirects to ForgeOS Investment Strategies.",
};

/** Legacy route — primary IA is /investment/strategies. */
export default function InvestmentStrategyLegacyRedirect() {
  permanentRedirect("/investment/strategies");
}
