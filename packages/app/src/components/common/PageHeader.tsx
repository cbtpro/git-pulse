import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="gp-page-header">
      <div>
        <p className="gp-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="gp-page-description">{description}</p>
      </div>
      {actions && <div className="gp-page-actions">{actions}</div>}
    </div>
  );
}
