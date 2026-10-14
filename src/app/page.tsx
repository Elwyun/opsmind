import Link from "next/link";

import { AnomalyQueue, MetricChart } from "../components/dashboard";
import { SetupNotice } from "../components/setup-notice";
import { Card, KpiCard, Notice, SeverityBadge } from "../components/ui";
import { getInvestigationProviderInfo } from "../lib/ai";
import {
  formatCurrency,
  formatDateLabel,
  formatNumber,
  formatSignedPercent,
} from "../lib/format";
import { getDashboardSummary } from "../lib/services/anomaly-service";
import { getPrimaryCompany } from "../lib/services/company-service";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const company = await getPrimaryCompany();
  if (!company) return <SetupNotice />;

  const summary = await getDashboardSummary({ companyId: company.id });
  const provider = getInvestigationProviderInfo();
  const topCandidate = summary.anomalies[0] ?? null;
  const trend = summary.trend;

  return (
    <>
      <div className="page-head">
        <h1>Overview</h1>
        <p>
          Consumption, production and the resulting energy intensity for {company.name}. Every figure
          below is calculated by the app from stored operational data.
        </p>
      </div>

      <Notice tone="warning" title="Simulated data">
        This prototype runs on a deterministic synthetic dataset labelled SIMULATED DATA. Nothing here
        is a real measurement, and no saving has been verified.
      </Notice>

      <div className="grid grid-4">
        <KpiCard
          label="Electricity used"
          value={formatNumber(summary.totalElectricityKwh, 0)}
          unit={`kWh across ${summary.dayCount} days`}
          note={`Total consumption ${summary.from ?? "—"} → ${summary.to ?? "—"}`}
        />
        <KpiCard
          label="Production"
          value={formatNumber(summary.totalProductionUnits, 0)}
          unit="units produced"
          note="Same period, as recorded"
        />
        <KpiCard
          label="Energy intensity"
          value={summary.averageIntensity === null ? "—" : summary.averageIntensity.toFixed(3)}
          unit="kWh per unit (average)"
          note={`Across ${summary.analyzableDayCount} analyzable days`}
          tone="neutral"
        />
        <KpiCard
          label="Estimated potential additional cost"
          value={formatCurrency(summary.estimatedPotentialCost, summary.currency)}
          unit={`${summary.anomalyCount} candidate day(s)`}
          note="Potential estimate, not a confirmed charge or verified saving."
          tone="warning"
        />
      </div>

      <div className="grid grid-2">
        <Card title="Electricity use" subtitle="kWh per day">
          <MetricChart
            title="Electricity use"
            unit="kWh"
            color="#0d7d78"
            points={trend.map((point) => ({
              ...point,
              value: point.electricityKwh,
            }))}
          />
        </Card>
        <Card title="Production" subtitle="units per day">
          <MetricChart
            title="Production"
            unit="units"
            color="#0e3a5c"
            points={trend.map((point) => ({
              ...point,
              value: point.productionUnits,
            }))}
          />
        </Card>
      </div>

      <Card
        title="Investigation queue"
        subtitle={`Days are flagged when intensity is at least ${summary.thresholdPercent}% above the trailing baseline (method ${summary.methodVersion}). This threshold is a prototype heuristic, not an industry standard.`}
      >
        <AnomalyQueue candidates={summary.anomalies} companyId={company.id} />
      </Card>

      <div className="split">
        <Card title="What needs attention?" subtitle="The strongest candidate, with its evidence.">
          {topCandidate ? (
            <div className="stack">
              <div className="row">
                <SeverityBadge severity={topCandidate.severity} />
                <span className="strong">{formatDateLabel(topCandidate.date)}</span>
              </div>
              <p style={{ marginBottom: 0 }}>
                Electricity was <strong>{formatSignedPercent(topCandidate.deviationPercent, 1)}</strong>{" "}
                above the selected baseline. Actual {topCandidate.actualIntensity.toFixed(3)} vs
                baseline {topCandidate.baselineIntensity.toFixed(3)} kWh/unit, while production stayed
                at {formatNumber(topCandidate.productionUnits)} units.
              </p>
              <p className="muted small" style={{ marginBottom: 0 }}>
                {topCandidate.evidenceSummary}
              </p>
              <p style={{ marginBottom: 0 }}>
                Estimated potential additional cost{" "}
                <strong>
                  {topCandidate.estimatedAdditionalCost === null
                    ? "—"
                    : formatCurrency(topCandidate.estimatedAdditionalCost, topCandidate.currency)}
                </strong>{" "}
                — a potential estimate. Possible contributing factors are listed as hypotheses and
                still need verification.
              </p>
              <div className="button-row">
                <Link className="button button-sm button-primary" href="/investigations">
                  Open the investigation queue
                </Link>
              </div>
            </div>
          ) : (
            <p className="muted" style={{ marginBottom: 0 }}>
              No candidate reached the prototype threshold in this period.
            </p>
          )}
        </Card>

        <Card title="Method and data health" subtitle="How these numbers were produced.">
          <table className="data">
            <tbody>
              <tr>
                <td>Detection method</td>
                <td className="num">{summary.methodVersion}</td>
              </tr>
              <tr>
                <td>Analyzable days</td>
                <td className="num">{summary.analyzableDayCount}</td>
              </tr>
              <tr>
                <td>
                  Days without enough baseline
                  <div className="muted small">Reported as insufficient data, never estimated</div>
                </td>
                <td className="num">{summary.insufficientDayCount}</td>
              </tr>
              <tr>
                <td>Data source</td>
                <td className="num">{summary.simulated ? "SIMULATED" : "MEASURED"}</td>
              </tr>
              <tr>
                <td>Investigation model</td>
                <td className="num">
                  {provider.isLive ? provider.modelName : `mock (${provider.modelName})`}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="muted small" style={{ marginTop: 12, marginBottom: 0 }}>
            {provider.isLive
              ? "Gemini is configured, so investigations call the live model. Its output is validated server-side."
              : "No GEMINI_API_KEY is set, so investigations use a deterministic mock labelled as simulated. It is never presented as live AI."}
          </p>
        </Card>
      </div>
    </>
  );
}
