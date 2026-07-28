import type { ReactNode } from "react";

interface PageHeaderProps {
  badge: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ badge, title, description, actions }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div>
        <span className="badge">{badge}</span>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}
