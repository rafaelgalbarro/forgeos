import { Panel } from "@/components/ui/fhis/Layout";

interface LegalPlaceholderProps {
  title: string;
  lastUpdated?: string;
  children: React.ReactNode;
}

export function LegalPlaceholder({ title, lastUpdated = "7 de julio de 2026", children }: LegalPlaceholderProps) {
  return (
    <article className="fhis-launch-legal">
      <header className="fhis-launch-legal-header">
        <h1 className="fhis-launch-legal-title">{title}</h1>
        <p className="fhis-launch-legal-updated">Última actualización: {lastUpdated}</p>
      </header>
      <Panel className="fhis-launch-legal-body">{children}</Panel>
    </article>
  );
}
