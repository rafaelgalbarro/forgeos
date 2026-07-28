"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { VentureProject } from "@/lib/domain/venture";
import {
  getOrBuildKnowledgeHubIndex,
  getNodeById,
  searchKnowledgeNodes,
  filterTreeBySearch,
  countNodesWithContent,
} from "@/lib/knowledge-hub";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { cn } from "@/lib/design-system/cn";
import { DocumentTree } from "./DocumentTree";
import { DocumentDetailPanel } from "./DocumentDetailPanel";
import { VersionHistoryPanel } from "./VersionHistoryPanel";
import { RelationsPanel } from "./RelationsPanel";
import { KnowledgeSearchBar } from "./KnowledgeSearchBar";

interface KnowledgeHubViewProps {
  venture: VentureProject;
}

export function KnowledgeHubView({ venture }: KnowledgeHubViewProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const index = useMemo(() => getOrBuildKnowledgeHubIndex(venture), [venture]);

  const searchResults = useMemo(
    () => searchKnowledgeNodes(index.tree, searchQuery),
    [index.tree, searchQuery]
  );

  const visibleNodeIds = useMemo(() => {
    if (!searchQuery.trim()) return undefined;
    return filterTreeBySearch(index.tree, searchQuery);
  }, [index.tree, searchQuery]);

  const selectedNode = selectedNodeId
    ? getNodeById(index.tree, selectedNodeId) ?? null
    : null;

  const versions = selectedNodeId
    ? index.versions[selectedNodeId] ?? []
    : [];

  const contentCount = countNodesWithContent(index.tree);

  return (
    <div className="fhis-kh venture-workspace">
      <header className="fhis-venture-topbar">
        <Link href="/dashboard" className="fhis-sidebar-logo">
          Forge<span>OS</span>
        </Link>
        <div className="venture-topbar-center">
          <h1 style={{ margin: 0, fontSize: "var(--fhis-text-lg)" }}>{venture.name}</h1>
          <Badge variant="blue">Knowledge Hub</Badge>
        </div>
        <div
          className="venture-topbar-actions"
          style={{ display: "flex", gap: "var(--fhis-space-2)", alignItems: "center" }}
        >
          <Link
            href={`/venture/${venture.id}`}
            className={cn("fhis-btn", "fhis-btn-secondary", "fhis-btn-sm")}
          >
            ← Workspace
          </Link>
          <Link href="/projects" className={cn("fhis-btn", "fhis-btn-ghost", "fhis-btn-sm")}>
            Empresas
          </Link>
        </div>
      </header>

      <Panel className="fhis-kh-toolbar-panel">
        <SectionHeader
          title="Venture Knowledge Hub"
          subtitle="Documentos unificados: discovery, research, producto, arquitectura, build, memoria y decisiones"
        />
        <KnowledgeSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          resultCount={searchQuery.trim() ? searchResults.length : undefined}
        />
        <div className="fhis-kh-meta">
          <Badge variant="accent">{contentCount} con contenido</Badge>
          <Badge variant="default">{index.tree.nodes.length} nodos</Badge>
          <Badge variant="accent">{index.relations.length} relaciones</Badge>
          <span className="fhis-kh-built-at">
            Índice: {new Date(index.builtAt).toLocaleString()}
          </span>
        </div>
      </Panel>

      <div className="fhis-kh-layout">
        <aside className="fhis-kh-sidebar">
          <DocumentTree
            tree={index.tree}
            selectedNodeId={selectedNodeId}
            onSelect={setSelectedNodeId}
            searchQuery={searchQuery}
            visibleNodeIds={visibleNodeIds}
          />
        </aside>

        <main className="fhis-kh-main">
          <DocumentDetailPanel node={selectedNode} />
        </main>

        <aside className="fhis-kh-aside">
          <VersionHistoryPanel versions={versions} nodeTitle={selectedNode?.title} />
          <RelationsPanel
            relations={index.relations}
            tree={index.tree}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
          />
        </aside>
      </div>
    </div>
  );
}
