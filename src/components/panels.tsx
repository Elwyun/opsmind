import type { DayMetrics } from "../lib/analysis/metrics";
import type { EvidenceItem, InvestigationModelOutput } from "../lib/ai/types";
import {
  formatCurrency,
  formatKwh,
  formatNumber,
  formatPercent,
  formatSignedPercent,
} from "../lib/format";
import { Card, ConfidenceBadge } from "./ui";

function EvidenceChips({ ids, evidence }: { ids: string[]; evidence: EvidenceItem[] }) {
  if (ids.length === 0) return null;
  const byId = new Map(evidence.map((item) => [item.id, item]));

  return (
    <div className="row">
      {ids.map((id) => {
        const item = byId.get(id);
        return (
          <span
            key={id}
            className="badge badge-muted"
            title={item ? `${item.label}: ${item.value} — ${item.source}` : "Unknown evidence reference"}
          >
            {item ? `${id} · ${item.label}` : id}
          </span>
        );
      })}
    </div>
  );
}

export function EvidenceList({ evidence }: { evidence: EvidenceItem[] }) {
  if (evidence.length === 0) {
    return <p className="muted small">No evidence list was stored with this investigation.</p>;
  }

  return (
    <div className="evidence-list">
      {evidence.map((item) => (
        <div className="evidence-item" key={item.id}>
          <span className="evidence-id">{item.id}</span>
          <div>
            <div className="evidence-value">
              {item.label}: {item.value}
            </div>
            <div className="evidence-source">{item.source}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CostEstimatePanel({
  metrics,
  currency,
}: {
  metrics: DayMetrics;
  currency: string;
}) {
  return (
    <Card
      title="Estimated impact"
      subtitle="A potential estimate from a transparent formula, not a confirmed charge."
    >
      <table className="data" style={{ marginBottom: 12 }}>
        <tbody>
          <tr>
            <td>
              Expected electricity at the baseline rate
              <div className="muted small">production × baseline intensity</div>
            </td>
            <td className="num">{metrics.expectedKwh === null ? "—" : formatKwh(metrics.expectedKwh, 1)}</td>
          </tr>
          <tr>
            <td>
              Potential excess electricity
              <div className="muted small">max(0, actual − expected)</div>
            </td>
            <td className="num">
              {metrics.potentialExcessKwh === null ? "—" : formatKwh(metrics.potentialExcessKwh, 1)}
            </td>
          </tr>
          <tr>
            <td>
              Electricity tariff
              <div className="muted small">tariff per kWh, not a bill total</div>
            </td>
            <td className="num">
              {metrics.tariffPerKwh === null
                ? "not recorded"
                : `${formatNumber(metrics.tariffPerKwh, 2)} ${currency}/kWh`}
            </td>
          </tr>
          <tr>
            <td className="strong">Estimated potential additional cost</td>
            <td className="num strong">
              {metrics.estimatedAdditionalCost === null
                ? "—"
                : formatCurrency(metrics.estimatedAdditionalCost, currency)}
            </td>
          </tr>
        </tbody>
      </table>

      {metrics.formula ? <div className="formula">{metrics.formula}</div> : null}

      {metrics.assumptions.length > 0 ? (
        <ul className="bullet-list" style={{ marginTop: 12 }}>
          {metrics.assumptions.map((assumption) => (
            <li key={assumption}>{assumption}</li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

export function DeviationPanel({ metrics, currency }: { metrics: DayMetrics; currency: string }) {
  return (
    <table className="data">
      <tbody>
        <tr>
          <td>Actual energy intensity</td>
          <td className="num">{metrics.actualIntensity.toFixed(3)} kWh/unit</td>
        </tr>
        <tr>
          <td>
            Baseline energy intensity
            <div className="muted small">
              {metrics.baselineFrom} → {metrics.baselineTo} ({metrics.baselineSampleSize} days)
            </div>
          </td>
          <td className="num">{metrics.baselineIntensity.toFixed(3)} kWh/unit</td>
        </tr>
        <tr>
          <td>Deviation above baseline</td>
          <td className="num strong">{formatSignedPercent(metrics.deviationPercent, 2)}</td>
        </tr>
        <tr>
          <td>Alert threshold (prototype heuristic)</td>
          <td className="num">{formatPercent(metrics.thresholdPercent)}</td>
        </tr>
        <tr>
          <td>
            Potential excess electricity
            <div className="muted small">at {currency} tariff {formatNumber(metrics.tariffPerKwh ?? 0, 2)}/kWh</div>
          </td>
          <td className="num">
            {metrics.potentialExcessKwh === null ? "—" : formatKwh(metrics.potentialExcessKwh, 1)}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export function AiOutputPanels({
  output,
  evidence,
}: {
  output: InvestigationModelOutput;
  evidence: EvidenceItem[];
}) {
  return (
    <div className="stack">
      <Card title="AI summary" subtitle="Written from the supplied context only.">
        <p style={{ marginBottom: 0 }}>{output.userSummary}</p>
      </Card>

      <Card title="Observations" subtitle="Facts taken from the evidence list.">
        <ul className="bullet-list">
          {output.observations.map((observation) => (
            <li key={observation.statement}>
              <div>{observation.statement}</div>
              <EvidenceChips ids={observation.evidenceIds} evidence={evidence} />
            </li>
          ))}
        </ul>
      </Card>

      <Card
        title="Possible contributing factors"
        subtitle="Hypotheses, not conclusions. Each one lists the evidence it is missing."
      >
        <div className="stack">
          {output.hypotheses.map((hypothesis) => (
            <div className="card" key={hypothesis.statement} style={{ boxShadow: "none" }}>
              <p>
                <strong>{hypothesis.statement}</strong>
              </p>
              <div className="row" style={{ marginBottom: 8 }}>
                <ConfidenceBadge level={hypothesis.confidence} />
              </div>
              <div className="small muted">Supporting evidence</div>
              <EvidenceChips ids={hypothesis.supportingEvidenceIds} evidence={evidence} />
              <div className="small muted" style={{ marginTop: 8 }}>
                Missing evidence needed to confirm
              </div>
              <ul className="bullet-list">
                {hypothesis.missingEvidence.map((missing) => (
                  <li key={missing}>{missing}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Recommended checks" subtitle="Human inspections. No automated equipment control.">
        <table className="data">
          <thead>
            <tr>
              <th>Check</th>
              <th>Why</th>
              <th>Priority</th>
            </tr>
          </thead>
          <tbody>
            {output.recommendedChecks.map((check) => (
              <tr key={check.title}>
                <td>{check.title}</td>
                <td className="muted">{check.reason}</td>
                <td>
                  <ConfidenceBadge level={check.priority} label="Priority" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title="Limitations" subtitle="What this investigation cannot tell you.">
        <ul className="bullet-list">
          {output.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
