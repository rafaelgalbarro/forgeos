import Link from "next/link";
import { OsModuleFrame } from "@/components/os/OsModuleFrame";
import { Card } from "@/components/ui/fhis/Card";
import { VANDL_VENTURE_ID } from "@/lib/fixtures/vandl-venture";

export const metadata = { title: "Knowledge — ForgeOS" };

export default function OsKnowledgePage() {
  return (
    <OsModuleFrame title="Knowledge" description="Hub de conocimiento del portfolio">
      <Card className="fhis-os-knowledge-card">
        <h3>VANDL Knowledge Hub</h3>
        <p>Documentos, research y activos de conocimiento del venture demo.</p>
        <Link href={`/venture/${VANDL_VENTURE_ID}/knowledge`}>Abrir Knowledge Hub →</Link>
      </Card>
    </OsModuleFrame>
  );
}
