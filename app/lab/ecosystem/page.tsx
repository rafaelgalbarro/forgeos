import { EcosystemLabView } from "@/components/ecosystem/EcosystemLabView";

export const metadata = {
  title: "Ecosystem Lab — ForgeOS Lab",
  description: "RC9 ForgeOS Ecosystem — CRM demo sandbox flow",
};

interface PageProps {
  searchParams: Promise<{ pack?: string }>;
}

export default async function EcosystemLabPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return <EcosystemLabView initialPackId={params.pack} />;
}
