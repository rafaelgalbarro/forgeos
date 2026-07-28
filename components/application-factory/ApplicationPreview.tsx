"use client";

import { useCallback, useState } from "react";
import type { PreviewApp, PreviewPage, PreviewSection } from "@/lib/application-factory";
import { getPreviewPageById } from "@/lib/application-factory";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { Badge } from "@/components/ui/fhis/Badge";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { EmptyState } from "@/components/ui/fhis/EmptyState";

interface Props {
  preview: PreviewApp | null;
}

export function ApplicationPreview({ preview }: Props) {
  const [currentPageId, setCurrentPageId] = useState<string>(
    preview?.defaultPageId ?? "dashboard"
  );

  const navigate = useCallback(
    (pageId: string) => {
      if (preview?.pages.some((p) => p.id === pageId)) {
        setCurrentPageId(pageId);
      }
    },
    [preview]
  );

  if (!preview) {
    return (
      <EmptyState
        title="Preview no disponible"
        description="Completa los pasos del pipeline hasta Preview para generar la app navegable."
      />
    );
  }

  const currentPage = getPreviewPageById(preview, currentPageId) ?? preview.pages[0];

  return (
    <Panel>
      <Stack gap="md">
        <SectionHeader
          title="Preview navegable"
          subtitle="Explora la aplicación generada — haz clic en la navegación para cambiar de página."
        />

        <div
          style={{
            border: "1px solid var(--fhis-color-border)",
            borderRadius: 8,
            overflow: "hidden",
            background: "#f8fafc",
          }}
        >
          {/* App chrome — top bar */}
          <div
            style={{
              background: preview.primaryColor,
              color: "#fff",
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <strong style={{ fontSize: 14 }}>{preview.appName}</strong>
            <div style={{ display: "flex", gap: 8 }}>
              {preview.authPages.includes(currentPageId) ? (
                <PreviewNavButton label="← Volver" onClick={() => navigate("dashboard")} />
              ) : (
                <>
                  <PreviewNavButton label="Login" onClick={() => navigate("login")} />
                  <PreviewNavButton label="Admin" onClick={() => navigate("admin")} />
                </>
              )}
            </div>
          </div>

          <div style={{ display: "flex", minHeight: 360 }}>
            {/* Sidebar nav — hidden on auth layout */}
            {currentPage.layout !== "auth" && (
              <nav
                style={{
                  width: 160,
                  background: "#fff",
                  borderRight: "1px solid var(--fhis-color-border)",
                  padding: "12px 0",
                }}
              >
                {preview.navItems.map((item) => (
                  <button
                    key={item.pageId}
                    type="button"
                    onClick={() => navigate(item.pageId)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 16px",
                      border: "none",
                      background: currentPageId === item.pageId ? "#eff6ff" : "transparent",
                      color: currentPageId === item.pageId ? preview.primaryColor : "inherit",
                      fontWeight: currentPageId === item.pageId ? 600 : 400,
                      fontSize: 13,
                      cursor: "pointer",
                      borderLeft:
                        currentPageId === item.pageId
                          ? `3px solid ${preview.primaryColor}`
                          : "3px solid transparent",
                    }}
                  >
                    {item.icon} {item.label}
                  </button>
                ))}
                {currentPage.layout === "admin" && (
                  <>
                    <div style={{ borderTop: "1px solid var(--fhis-color-border)", margin: "8px 0" }} />
                    {preview.adminPages.map((pageId) => {
                      const page = getPreviewPageById(preview, pageId);
                      if (!page) return null;
                      return (
                        <button
                          key={pageId}
                          type="button"
                          onClick={() => navigate(pageId)}
                          style={{
                            display: "block",
                            width: "100%",
                            textAlign: "left",
                            padding: "8px 16px",
                            border: "none",
                            background: currentPageId === pageId ? "#fef3c7" : "transparent",
                            fontSize: 13,
                            cursor: "pointer",
                          }}
                        >
                          🛡 {page.title}
                        </button>
                      );
                    })}
                  </>
                )}
              </nav>
            )}

            {/* Main content area */}
            <main style={{ flex: 1, padding: 16, background: "#fff", overflow: "auto" }}>
              <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <Badge variant="accent">{currentPage.title}</Badge>
                <Badge variant="default">{currentPage.layout}</Badge>
              </div>
              <PreviewPageContent page={currentPage} primaryColor={preview.primaryColor} onNavigate={navigate} />
            </main>
          </div>

          {/* Bottom tab bar for mobile-style nav */}
          <div
            style={{
              display: "flex",
              borderTop: "1px solid var(--fhis-color-border)",
              background: "#fff",
            }}
          >
            {["dashboard", "items", "settings", "login"].map((id) => {
              const page = getPreviewPageById(preview, id);
              if (!page) return null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => navigate(id)}
                  style={{
                    flex: 1,
                    padding: "8px 4px",
                    border: "none",
                    background: currentPageId === id ? "#eff6ff" : "transparent",
                    fontSize: 11,
                    cursor: "pointer",
                    color: currentPageId === id ? preview.primaryColor : "var(--fhis-color-text-muted)",
                  }}
                >
                  {page.title}
                </button>
              );
            })}
          </div>
        </div>

        <p style={{ margin: 0, fontSize: 12, color: "var(--fhis-color-text-muted)" }}>
          {preview.pages.length} páginas · Preview funcional con routing interno (sin iframe)
        </p>
      </Stack>
    </Panel>
  );
}

function PreviewNavButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "rgba(255,255,255,0.2)",
        border: "1px solid rgba(255,255,255,0.4)",
        color: "#fff",
        borderRadius: 4,
        padding: "4px 10px",
        fontSize: 12,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function PreviewPageContent({
  page,
  primaryColor,
  onNavigate,
}: {
  page: PreviewPage;
  primaryColor: string;
  onNavigate: (pageId: string) => void;
}) {
  return (
    <Stack gap="md">
      {page.content.map((section, i) => (
        <PreviewSectionRenderer key={i} section={section} primaryColor={primaryColor} onNavigate={onNavigate} />
      ))}
    </Stack>
  );
}

function PreviewSectionRenderer({
  section,
  primaryColor,
  onNavigate,
}: {
  section: PreviewSection;
  primaryColor: string;
  onNavigate: (pageId: string) => void;
}) {
  switch (section.type) {
    case "hero":
      return (
        <div
          style={{
            background: `linear-gradient(135deg, ${primaryColor}, #6366f1)`,
            color: "#fff",
            padding: 24,
            borderRadius: 8,
            textAlign: "center",
          }}
        >
          <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>{section.title}</h2>
          <p style={{ margin: 0, opacity: 0.9, fontSize: 14 }}>
            {(section.data?.subtitle as string) ?? ""}
          </p>
        </div>
      );

    case "stats": {
      const items = (section.data?.items as { label: string; value: string; trend: string }[]) ?? [];
      return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
          {items.map((item) => (
            <div
              key={item.label}
              style={{
                padding: 16,
                background: "#f1f5f9",
                borderRadius: 8,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 700, color: primaryColor }}>{item.value}</div>
              <div style={{ fontSize: 12, color: "var(--fhis-color-text-muted)" }}>{item.label}</div>
              {item.trend && (
                <div style={{ fontSize: 11, color: item.trend.startsWith("+") ? "#16a34a" : "#dc2626" }}>
                  {item.trend}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    case "table": {
      const columns = (section.data?.columns as string[]) ?? [];
      const rows = (section.data?.rows as string[][]) ?? [];
      return (
        <div>
          {section.title && <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>{section.title}</h3>}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col}
                    style={{
                      textAlign: "left",
                      padding: "8px 12px",
                      borderBottom: "2px solid var(--fhis-color-border)",
                      background: "#f8fafc",
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr
                  key={ri}
                  style={{ cursor: "pointer" }}
                  onClick={() => onNavigate("item-detail")}
                >
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      style={{ padding: "8px 12px", borderBottom: "1px solid var(--fhis-color-border)" }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case "list": {
      const items = (section.data?.items as { text: string; time: string }[]) ?? [];
      return (
        <div>
          {section.title && <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>{section.title}</h3>}
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {items.map((item, i) => (
              <li
                key={i}
                style={{
                  padding: "10px 12px",
                  borderBottom: "1px solid var(--fhis-color-border)",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                }}
              >
                <span>{item.text}</span>
                <span style={{ color: "var(--fhis-color-text-muted)", fontSize: 12 }}>{item.time}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    case "form": {
      const fields = (section.data?.fields as string[]) ?? [];
      const actions = (section.data?.actions as string[]) ?? [];
      return (
        <div style={{ maxWidth: 360, margin: section.title?.includes("sesión") ? "0 auto" : undefined }}>
          {section.title && <h3 style={{ margin: "0 0 16px", fontSize: 15 }}>{section.title}</h3>}
          <Stack gap="sm">
            {fields.map((field) => (
              <div key={field}>
                <label style={{ fontSize: 12, color: "var(--fhis-color-text-muted)" }}>{field}</label>
                <input
                  readOnly
                  placeholder={field}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    marginTop: 4,
                    borderRadius: 6,
                    border: "1px solid var(--fhis-color-border)",
                    fontSize: 14,
                    boxSizing: "border-box",
                  }}
                />
              </div>
            ))}
            {actions.map((action, i) => (
              <button
                key={action}
                type="button"
                onClick={() => {
                  if (action.includes("cuenta") || action.includes("Registr")) onNavigate("register");
                  if (action.includes("sesión") || action.includes("Login")) onNavigate("dashboard");
                }}
                style={{
                  padding: "10px 16px",
                  borderRadius: 6,
                  border: i === 0 ? "none" : "1px solid var(--fhis-color-border)",
                  background: i === 0 ? primaryColor : "transparent",
                  color: i === 0 ? "#fff" : "inherit",
                  fontSize: 13,
                  cursor: "pointer",
                  width: i === 0 ? "100%" : "auto",
                }}
              >
                {action}
              </button>
            ))}
          </Stack>
        </div>
      );
    }

    case "card-grid": {
      const cards = (section.data?.cards as { label: string; value: string }[]) ?? [];
      return (
        <div>
          {section.title && <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>{section.title}</h3>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {cards.map((card) => (
              <div
                key={card.label}
                style={{
                  padding: 12,
                  background: "#f8fafc",
                  borderRadius: 8,
                  border: "1px solid var(--fhis-color-border)",
                }}
              >
                <div style={{ fontSize: 11, color: "var(--fhis-color-text-muted)" }}>{card.label}</div>
                <div style={{ fontSize: 14, marginTop: 4 }}>{card.value}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}
