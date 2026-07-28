import { WebsiteFactoryDashboard } from "@/components/website-factory/WebsiteFactoryDashboard";

export const metadata = {
  title: "Website Factory — Lab",
  description: "Program 4400 lab harness — website wizard pipeline",
};

export default function WebsiteFactoryLabPage() {
  return <WebsiteFactoryDashboard showLabLink />;
}
