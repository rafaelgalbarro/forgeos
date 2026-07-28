import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

/** Legacy route — workspace now lives at /venture/[id] */
export default async function LegacyResultadoRedirect({ params }: PageProps) {
  const { id } = await params;
  redirect(`/venture/${id}`);
}
