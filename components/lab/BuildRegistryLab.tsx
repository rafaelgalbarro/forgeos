"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import { Card } from "@/components/ui/fhis/Card";
import { Container, Grid, Panel, Stack } from "@/components/ui/fhis/Layout";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Status } from "@/components/ui/fhis/Status";
import type { FhisStatus } from "@/lib/design-system/types";
import {
  createBuildRegistryLab,
  type BuildRegistryLabSession,
  type RegistryDomainSummary,
} from "@/lib/lab/build-registry-lab";
import type {
  RegistryEntry,
  RegistryEntryStatus,
  RegistryEntryType,
} from "@/lib/build-platform/build-registry/types";
import {
  REGISTRY_ENTRY_STATUS_LABELS,
  REGISTRY_ENTRY_TYPE_LABELS,
} from "@/lib/build-platform/build-registry/types";

function statusToFhis(status: RegistryEntryStatus): FhisStatus {
  switch (status) {
    case "stable":
      return "success";
    case "beta":
      return "active";
    case "experimental":
      return "warning";
    case "deprecated":
      return "error";
    case "draft":
    default:
      return "pending";
  }
}

function statusBadgeVariant(status: RegistryEntryStatus): "blue" | "amber" | "red" | "accent" | "default" {
  switch (status) {
    case "stable":
      return "blue";
    case "beta":
    case "experimental":
      return "amber";
    case "deprecated":
      return "red";
    case "draft":
      return "default";
    default:
      return "default";
  }
}

function typeBadgeVariant(type: RegistryEntryType): "accent" | "blue" | "default" {
  switch (type) {
    case "generator":
      return "accent";
    case "technology":
      return "blue";
    default:
      return "default";
  }
}

function PanelTitle({ children }: { children: ReactNode }) {
  return <p style={{ margin: "0 0 var(--fhis-space-2)", fontWeight: 600 }}>{children}</p>;
}

function RegistryTable({ entries }: { entries: RegistryEntry[] }) {
  if (entries.length === 0) {
    return <p style={{ opacity: 0.7, margin: 0 }}>No entries match the current filter.</p>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--fhis-border-subtle)" }}>
            <th style={{ textAlign: "left", padding: "var(--fhis-space-2)" }}>ID</th>
            <th style={{ textAlign: "left", padding: "var(--fhis-space-2)" }}>Name</th>
            <th style={{ textAlign: "left", padding: "var(--fhis-space-2)" }}>Type</th>
            <th style={{ textAlign: "left", padding: "var(--fhis-space-2)" }}>Version</th>
            <th style={{ textAlign: "left", padding: "var(--fhis-space-2)" }}>Status</th>
            <th style={{ textAlign: "left", padding: "var(--fhis-space-2)" }}>Capabilities</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} style={{ borderBottom: "1px solid var(--fhis-border-subtle)" }}>
              <td style={{ padding: "var(--fhis-space-2)", fontFamily: "monospace", fontSize: "0.8rem" }}>
                {entry.id}
              </td>
              <td style={{ padding: "var(--fhis-space-2)" }}>
                <div>{entry.name}</div>
                <div style={{ opacity: 0.7, fontSize: "0.8rem", marginTop: 2 }}>{entry.description}</div>
              </td>
              <td style={{ padding: "var(--fhis-space-2)" }}>
                <Badge variant={typeBadgeVariant(entry.type)}>
                  {REGISTRY_ENTRY_TYPE_LABELS[entry.type]}
                </Badge>
                {entry.category && (
                  <div style={{ marginTop: 4, fontSize: "0.75rem", opacity: 0.7 }}>{entry.category}</div>
                )}
              </td>
              <td style={{ padding: "var(--fhis-space-2)" }}>{entry.version}</td>
              <td style={{ padding: "var(--fhis-space-2)" }}>
                <Status status={statusToFhis(entry.status)} label={REGISTRY_ENTRY_STATUS_LABELS[entry.status]} />
              </td>
              <td style={{ padding: "var(--fhis-space-2)" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {entry.capabilities.slice(0, 3).map((c) => (
                    <Badge key={c.id} variant="default">{c.label}</Badge>
                  ))}
                  {entry.capabilities.length > 3 && (
                    <Badge variant="default">+{entry.capabilities.length - 3}</Badge>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DomainCard({ domain, onSelect }: { domain: RegistryDomainSummary; onSelect: (domain: RegistryDomainSummary) => void }) {
  return (
    <Card style={{ cursor: "pointer" }} onClick={() => onSelect(domain)}>
      <Stack gap="sm">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 600 }}>{domain.label}</span>
          <Badge variant="blue">{domain.count}</Badge>
        </div>
        <Status status="active" label="Seeded" />
      </Stack>
    </Card>
  );
}

export function BuildRegistryLab() {
  const [session] = useState<BuildRegistryLabSession>(() => createBuildRegistryLab());
  const [tick, setTick] = useState(0);
  const [typeFilter, setTypeFilter] = useState<RegistryEntryType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<RegistryEntryStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | "all">("all");

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const stats = useMemo(() => session.getStats(), [session, tick]);
  const domains = useMemo(() => session.getDomains(), [session, tick]);
  const versions = useMemo(() => session.getVersions(), [session, tick]);

  const filteredEntries = useMemo(() => {
    const query: Parameters<BuildRegistryLabSession["filter"]>[0] = {};
    if (typeFilter !== "all") query.type = typeFilter;
    if (statusFilter !== "all") query.status = statusFilter;
    if (categoryFilter !== "all") query.category = categoryFilter;
    if (search.trim()) query.search = search.trim();
    return session.filter(query);
  }, [session, tick, typeFilter, statusFilter, categoryFilter, search]);

  const handleReset = useCallback(() => {
    session.reset();
    setTypeFilter("all");
    setStatusFilter("all");
    setCategoryFilter("all");
    setSearch("");
    refresh();
  }, [session, refresh]);

  const handleDomainSelect = useCallback((domain: RegistryDomainSummary) => {
    if (domain.entryType === "generator-group" && domain.category) {
      setTypeFilter("generator");
      setCategoryFilter(domain.category);
    } else if (domain.entryType !== "generator-group") {
      setTypeFilter(domain.entryType);
      setCategoryFilter("all");
    }
    refresh();
  }, [refresh]);

  const stableCount = stats.byStatus.stable ?? 0;
  const generatorCount = stats.byType.generator ?? 0;

  return (
    <Container style={{ paddingBlock: "var(--fhis-space-6)" }}>
      <Stack gap="lg">
        <header>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--fhis-space-2)", marginBottom: "var(--fhis-space-2)" }}>
            <Badge variant="accent">Epic 6.2</Badge>
            <Badge variant="default">Build Registry</Badge>
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>Build Registry</h1>
          <p style={{ opacity: 0.8, marginTop: "var(--fhis-space-2)" }}>
            Official registry for generators, providers, artifacts, workers, templates, and technology stacks.
          </p>
        </header>

        <Panel>
          <Stack gap="sm">
            <PanelTitle>Actions</PanelTitle>
            <div style={{ display: "flex", gap: "var(--fhis-space-2)", flexWrap: "wrap", alignItems: "center" }}>
              <Button onClick={refresh}>Refresh</Button>
              <Button variant="secondary" onClick={handleReset}>Reset Registry</Button>
              <Status status="success" label="Official seeds loaded" />
            </div>
          </Stack>
        </Panel>

        <Grid cols={4} gap="md">
          <Card>
            <KpiBlock label="Total Entries" value={String(stats.total)} />
          </Card>
          <Card>
            <KpiBlock label="Generators" value={String(generatorCount)} />
          </Card>
          <Card>
            <KpiBlock label="Stable" value={String(stableCount)} />
          </Card>
          <Card>
            <KpiBlock label="Versions" value={String(versions.length)} />
          </Card>
        </Grid>

        <Panel>
          <Stack gap="md">
            <PanelTitle>Registry Domains</PanelTitle>
            <Grid cols={3} gap="md">
              {domains.map((d) => (
                <DomainCard key={d.id} domain={d} onSelect={handleDomainSelect} />
              ))}
            </Grid>
          </Stack>
        </Panel>

        <Panel>
          <Stack gap="md">
            <PanelTitle>Filters</PanelTitle>
            <div style={{ display: "flex", gap: "var(--fhis-space-3)", flexWrap: "wrap", alignItems: "center" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.85rem" }}>
                Type
                <select
                  value={typeFilter}
                  onChange={(e) => { setTypeFilter(e.target.value as RegistryEntryType | "all"); refresh(); }}
                  style={{ padding: "var(--fhis-space-2)", borderRadius: 4, border: "1px solid var(--fhis-border-subtle)" }}
                >
                  <option value="all">All types</option>
                  {(Object.keys(REGISTRY_ENTRY_TYPE_LABELS) as RegistryEntryType[]).map((t) => (
                    <option key={t} value={t}>{REGISTRY_ENTRY_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.85rem" }}>
                Status
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value as RegistryEntryStatus | "all"); refresh(); }}
                  style={{ padding: "var(--fhis-space-2)", borderRadius: 4, border: "1px solid var(--fhis-border-subtle)" }}
                >
                  <option value="all">All statuses</option>
                  {(Object.keys(REGISTRY_ENTRY_STATUS_LABELS) as RegistryEntryStatus[]).map((s) => (
                    <option key={s} value={s}>{REGISTRY_ENTRY_STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.85rem" }}>
                Category
                <input
                  value={categoryFilter === "all" ? "" : categoryFilter}
                  onChange={(e) => { setCategoryFilter(e.target.value || "all"); refresh(); }}
                  placeholder="e.g. frontend"
                  style={{ padding: "var(--fhis-space-2)", borderRadius: 4, border: "1px solid var(--fhis-border-subtle)" }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.85rem", flex: 1, minWidth: 200 }}>
                Search
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); refresh(); }}
                  placeholder="Search id, name, capabilities…"
                  style={{ padding: "var(--fhis-space-2)", borderRadius: 4, border: "1px solid var(--fhis-border-subtle)" }}
                />
              </label>
            </div>
            <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.7 }}>
              Showing {filteredEntries.length} of {stats.total} entries
            </p>
          </Stack>
        </Panel>

        <Panel>
          <Stack gap="md">
            <PanelTitle>Registry Entries</PanelTitle>
            <RegistryTable entries={filteredEntries} />
          </Stack>
        </Panel>

        <Panel>
          <Stack gap="sm">
            <PanelTitle>Version Index</PanelTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--fhis-space-2)" }}>
              {versions.map((v) => (
                <Badge key={v} variant="blue">{v}</Badge>
              ))}
            </div>
          </Stack>
        </Panel>
      </Stack>
    </Container>
  );
}
