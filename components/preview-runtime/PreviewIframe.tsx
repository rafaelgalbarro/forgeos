"use client";

interface Props {
  url: string;
  title?: string;
  height?: number;
}

export function PreviewIframe({ url, title = "Sandbox preview", height = 480 }: Props) {
  if (!url.startsWith("http://127.0.0.1") && !url.startsWith("http://localhost")) {
    return (
      <div className="fhis-empty-state" style={{ padding: 24 }}>
        <div className="fhis-empty-state-title">Preview bloqueado</div>
        <p style={{ fontSize: "0.85rem" }}>Solo URLs localhost permitidas.</p>
      </div>
    );
  }

  return (
    <iframe
      src={url}
      title={title}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      style={{
        width: "100%",
        height,
        border: "1px solid var(--fhis-color-border, #334155)",
        borderRadius: 8,
        background: "#fff",
      }}
      referrerPolicy="no-referrer"
    />
  );
}
