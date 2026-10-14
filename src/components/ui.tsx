import type { ReactNode } from "react";

export function Card({
  title,
  subtitle,
  actions,
  children,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="card">
      {(title || actions) && (
        <header className="card-header">
          <div>
            {title ? <h2 className="card-title">{title}</h2> : null}
            {subtitle ? <p className="card-subtitle">{subtitle}</p> : null}
          </div>
          {actions ? <div className="row">{actions}</div> : null}
        </header>
      )}
      {children}
    </section>
  );
}

export function KpiCard({
  label,
  value,
  unit,
  note,
  tone = "accent",
}: {
  label: string;
  value: string;
  unit?: string;
  note?: ReactNode;
  tone?: "accent" | "warning" | "neutral";
}) {
  return (
    <div className="kpi" data-tone={tone === "accent" ? undefined : tone}>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
      {unit ? <span className="kpi-unit">{unit}</span> : null}
      {note ? <span className="kpi-note">{note}</span> : null}
    </div>
  );
}

const SEVERITY_LABELS: Record<string, string> = {
  INFO: "Info",
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

const SEVERITY_CLASSES: Record<string, string> = {
  INFO: "badge badge-info",
  LOW: "badge badge-low",
  MEDIUM: "badge badge-medium",
  HIGH: "badge badge-high",
};

export function SeverityBadge({ severity }: { severity: string | null }) {
  if (!severity) return <span className="badge badge-muted">Not rated</span>;
  return (
    <span className={SEVERITY_CLASSES[severity] ?? "badge badge-muted"}>
      {SEVERITY_LABELS[severity] ?? severity}
    </span>
  );
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  PENDING: "Pending",
  RUNNING: "Running",
  FAILED: "Failed",
  INSUFFICIENT_DATA: "Insufficient data",
};

const STATUS_CLASSES: Record<string, string> = {
  OPEN: "badge badge-open",
  IN_PROGRESS: "badge badge-progress",
  COMPLETED: "badge badge-completed",
  CANCELLED: "badge badge-muted",
  PENDING: "badge badge-muted",
  RUNNING: "badge badge-progress",
  FAILED: "badge badge-high",
  INSUFFICIENT_DATA: "badge badge-muted",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={STATUS_CLASSES[status] ?? "badge badge-muted"}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function ConfidenceBadge({ level, label = "Confidence" }: { level: string; label?: string }) {
  const className =
    level === "HIGH" ? "badge badge-low" : level === "MEDIUM" ? "badge badge-info" : "badge badge-muted";
  return (
    <span className={className}>
      {label}: {level.toLowerCase()}
    </span>
  );
}

/** Distinguishes simulated data from measured data. Never colour-only. */
export function DataLabelBadge({ label }: { label: "SIMULATED DATA" | "MEASURED DATA" | null }) {
  if (label === "MEASURED DATA") {
    return <span className="badge badge-muted">Measured data</span>;
  }
  return <span className="badge badge-simulated">Simulated data</span>;
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children}
    </div>
  );
}

export function Notice({
  tone,
  title,
  children,
}: {
  tone: "info" | "warning" | "error" | "success";
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className={`notice notice-${tone}`}>
      {title ? <div className="notice-title">{title}</div> : null}
      <div>{children}</div>
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="stack-sm">
      <span className="kpi-label">{label}</span>
      <span className="strong num">{value}</span>
    </div>
  );
}
