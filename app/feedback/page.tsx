import type { Metadata } from "next";
import { DesignPartnerFeedbackPage } from "@/components/design-partners/DesignPartnerFeedbackPage";

export const metadata: Metadata = {
  title: "Feedback — ForgeOS Design Partners",
  description: "Envía feedback e issues para validar hipótesis con design partners.",
};

export default function FeedbackRoute() {
  return <DesignPartnerFeedbackPage />;
}
