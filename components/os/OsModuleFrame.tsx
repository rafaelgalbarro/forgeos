import type { ReactNode } from "react";

export function OsModuleFrame({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="fhis-os-module">
      <header className="fhis-os-module-header">
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </header>
      <div className="fhis-os-module-body">{children}</div>
    </div>
  );
}
