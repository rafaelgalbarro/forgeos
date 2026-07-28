import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { AgentDetail } from "@/components/marketplace/AgentDetail";
import { resolveAgentDetail, resolveAgentSlugs } from "@/lib/agents-marketplace/agent-detail";

interface AgentDetailPageProps {
  params: Promise<{ agentId: string }>;
}

export async function generateStaticParams() {
  return resolveAgentSlugs().map((slug) => ({ agentId: slug }));
}

export async function generateMetadata({ params }: AgentDetailPageProps) {
  const { agentId } = await params;
  const agent = resolveAgentDetail(agentId);
  if (!agent) return { title: "Agente no encontrado — ForgeOS" };
  return {
    title: `${agent.name} — Marketplace — ForgeOS`,
    description: agent.description,
  };
}

export default async function AgentDetailPage({ params }: AgentDetailPageProps) {
  const { agentId } = await params;
  const agent = resolveAgentDetail(agentId);
  if (!agent) notFound();

  return (
    <section>
      <PageHeader
        badge="Agente IA"
        title={agent.name}
        description={agent.role}
      />
      <AgentDetail agent={agent} />
    </section>
  );
}
