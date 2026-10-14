import { formatDateLabel } from "../lib/format";
import type { CompanyDto } from "../lib/serializers";
import { ResetDemoButton } from "./client/reset-demo-button";

export function TopBar({
  company,
  period,
}: {
  company: CompanyDto | null;
  period: { from: string | null; to: string | null };
}) {
  const periodLabel =
    period.from && period.to
      ? `${formatDateLabel(period.from)} – ${formatDateLabel(period.to)}`
      : "No operational data loaded";

  return (
    <header className="topbar">
      <div className="topbar-context">
        <strong>{company?.name ?? "No demo company found"}</strong>
        <span className="muted small">
          {company?.location ?? "Seed the demo data to begin"} · {periodLabel}
        </span>
      </div>

      <div className="topbar-meta">
        <span className="simulated-badge">SIMULATED DATA</span>
        <ResetDemoButton />
      </div>
    </header>
  );
}
