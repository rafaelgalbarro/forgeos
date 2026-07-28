import type { Metadata } from "next";
import { FeedbackCenterHub } from "@/components/customer-success/FeedbackCenterHub";

export const metadata: Metadata = {
  title: "Centro de feedback — ForgeOS",
  description: "Inbox unificado de feedback, issues, ideas y NPS.",
};

export default function FeedbackCenterRoute() {
  return <FeedbackCenterHub />;
}
