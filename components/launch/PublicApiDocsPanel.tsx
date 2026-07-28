"use client";

import Link from "next/link";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { listPublicApiDocs, getPublicApiVersion, listPublicSdkLinks } from "@/lib/forgeos-launch";

export function PublicApiDocsPanel() {
  const endpoints = listPublicApiDocs();
  const version = getPublicApiVersion();
  const sdkLinks = listPublicSdkLinks();

  return (
    <Stack gap="lg">
      <SectionHeader
        title="API pública"
        description={`Referencia de endpoints comerciales — ${version}`}
      />
      <Stack gap="sm">
        {endpoints.map((ep) => (
          <Panel key={ep.id} className="fhis-api-doc-entry">
            <div className="fhis-api-doc-header">
              <Badge variant="accent">{ep.method}</Badge>
              <code>{ep.path}</code>
              {ep.planRequired && <Badge variant="default">Plan {ep.planRequired}+</Badge>}
            </div>
            <p>{ep.summary}</p>
          </Panel>
        ))}
      </Stack>

      <SectionHeader title="SDK y desarrolladores" description="Enlaces a superficies de extensión" />
      <div className="fhis-sdk-links">
        {sdkLinks.map((link) => (
          <Link key={link.id} href={link.href} className="fhis-btn fhis-btn-ghost fhis-btn-sm">
            {link.title}
            {link.language && ` (${link.language})`}
          </Link>
        ))}
      </div>
    </Stack>
  );
}
