import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

/** Legacy route — ventures now build at /build/[id] */
export default async function LegacyGeneratingRedirect({ params }: PageProps) {
  const { id } = await params;
  redirect(`/build/${id}`);
}
