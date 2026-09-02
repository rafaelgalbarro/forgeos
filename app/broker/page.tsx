import { permanentRedirect } from "next/navigation";

/** Permanent alias — primary IBKR surface lives under Investment OS. */
export default function BrokerAliasPage() {
  permanentRedirect("/investment/broker");
}
