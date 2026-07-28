"use client";

import Link from "next/link";
import { Container, Grid, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { listLegalDocuments } from "@/lib/commercial";

const STATUS_LABEL: Record<string, string> = {
  ready: "Listo",
  placeholder: "Placeholder",
  draft: "Borrador",
};

export function LegalHub() {
  const docs = listLegalDocuments();

  return (
    <Container>
      <Stack gap="lg">
        <SectionHeader
          title="Centro legal"
          description="Privacidad, términos, cookies, DPA, seguridad y cumplimiento"
        />

        <Grid cols={2} gap="md">
          {docs.map((doc) => (
            <Link key={doc.id} href={doc.href}>
              <Panel className="fhis-docs-card">
                <Badge variant={doc.status === "ready" ? "accent" : "default"}>
                  {STATUS_LABEL[doc.status]}
                </Badge>
                <h3>{doc.title}</h3>
                <p>{doc.summary}</p>
              </Panel>
            </Link>
          ))}
        </Grid>
      </Stack>
    </Container>
  );
}
