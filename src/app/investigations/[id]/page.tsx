import Link from "next/link";
import { notFound } from "next/navigation";

import { NotFoundError } from "../../../lib/api/http-error";
import {
  ActionControls,
  ActionCreator,
  VerificationForm,
} from "../../../components/client/investigation-actions";
import {
  AiOutputPanels,
  CostEstimatePanel,
  DeviationPanel,
  EvidenceList,
} from "../../../components/panels";
import { Card, DataLabelBadge, EmptyState, Notice, SeverityBadge, StatusBadge } from "../../../components/ui";
import { analyzeDay } from "../../../lib/analysis/metrics";
import { formatCurrency, formatDateLabel, formatNumber } from "../../../lib/format";
import { getCompanyById } from "../../../lib/services/company-service";
import { getInvestigationById } from "../../../lib/services/investigation-service";
import { listDailyRecords } from "../../../lib/services/operational-data-service";
import { listVerificationsForInvestigation } from "../../../lib/services/verification-service";

export const dynamic = "force-dynamic";

export default async function InvestigationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const investigation = await getInvestigationById(id).catch((error: unknown) => {
    if (error instanceof NotFoundError) notFound();
    throw error;
  });

  const [company, records, verifications] = await Promise.all([
    getCompanyById(investigation.companyId),
    listDailyRecords(investigation.companyId),
    listVerificationsForInvestigation(investigation.id),
  ]);

  const target = records.find((record) => record.date === investigation.targetDate) ?? null;
  const analysis = target ? analyzeDay(target, records) : null;
  const metrics = analysis && analysis.status === "OK" ? analysis.metrics : null;
  const result = investigation.result;
  const actionTitles = new Map(investigation.actions.map((action) => [action.id, action.title]));

  return (
    <>
      <div className="page-head">
        <Link className="button button-sm" href="/investigations">
          ← Back to investigations
        </Link>
        <h1>Investigation — {formatDateLabel(investigation.targetDate)}</h1>
        <p>
          {company.name}. Metrics are calculated from stored operational data; the AI section only
          explains the supplied evidence.
        </p>
      </div>

      <div className="row">
        <StatusBadge status={investigation.status} />
        <SeverityBadge severity={investigation.severity} />
        <DataLabelBadge label={result?.dataLabel ?? null} />
        <span className="badge badge-muted">Method {investigation.methodVersion}</span>
      </div>

      {investigation.status === "FAILED" ? (
        <Notice tone="error" title="Investigation failed">
          The model call did not return a usable answer ({investigation.errorCode ?? "unknown error"}).
          No substitute result was generated, and nothing was stored as a finding. The calculated
          metrics below are still valid.
        </Notice>
      ) : null}

      {investigation.status === "INSUFFICIENT_DATA" ? (
        <Notice tone="warning" title="Insufficient data">
          This day cannot be analysed with the current method, so no anomaly metrics or AI explanation
          were produced. Reasons include zero production, missing values, or too few comparison days.
        </Notice>
      ) : null}

      <div className="split">
        <div className="stack">
          <Card
            title="Anomaly summary"
            subtitle="What was measured, and what it was compared against."
          >
            {metrics ? (
              <DeviationPanel metrics={metrics} currency={investigation.currency} />
            ) : (
              <EmptyState title="No calculated metrics for this day">
                {analysis?.reason ?? "The stored record could not produce an energy intensity."}
              </EmptyState>
            )}
          </Card>

          {metrics ? (
            <CostEstimatePanel metrics={metrics} currency={investigation.currency} />
          ) : null}

          {target ? (
            <Card title="Record context" subtitle="The source at a point in time.">
              <table className="data">
                <tbody>
                  <tr>
                    <td>Production</td>
                    <td className="num">{formatNumber(target.productionUnits ?? 0)} units</td>
                  </tr>
                  <tr>
                    <td>Electricity consumed</td>
                    <td className="num">{formatNumber(target.electricityKwh ?? 0, 1)} kWh</td>
                  </tr>
                  <tr>
                    <td>Operating hours</td>
                    <td className="num">
                      {target.operatingHours === null
                        ? "not recorded"
                        : formatNumber(target.operatingHours, 2)}
                    </td>
                  </tr>
                  <tr>
                    <td>Weather context</td>
                    <td className="num">
                      {target.weather ?? "—"}
                      {target.temperatureC === null ? "" : `, ${formatNumber(target.temperatureC, 1)} °C`}
                      {target.humidityPercent === null
                        ? ""
                        : `, ${formatNumber(target.humidityPercent, 0)} % RH`}
                    </td>
                  </tr>
                  <tr>
                    <td>Tariff on record</td>
                    <td className="num">
                      {formatNumber(target.electricityPrice ?? 0, 2)} {investigation.currency}/kWh
                    </td>
                  </tr>
                  <tr>
                    <td>Source</td>
                    <td className="num">
                      {target.sourceType}
                      {target.sourceName ? ` · ${target.sourceName}` : ""}
                    </td>
                  </tr>
                </tbody>
              </table>
            </Card>
          ) : null}

          {result ? (
            <>
              <Notice tone="info" title={result.isLive ? "Live model" : "Simulated model"}>
                {result.isLive
                  ? `Answer produced by ${result.modelName} (prompt ${result.promptVersion}). Output validated server-side.`
                  : `No API key is configured, so this answer comes from the deterministic mock (${result.modelName}). It is simulated and never presented as live AI.`}
              </Notice>
              <AiOutputPanels output={result.output} evidence={result.evidence} />
            </>
          ) : null}
        </div>

        <div className="stack">
          <Card
            title="Evidence"
            subtitle="Every claim in the AI output cites one of these items."
            actions={
              result && result.discardedEvidenceIds.length > 0 ? (
                <span className="badge badge-medium">
                  {result.discardedEvidenceIds.length} reference(s) discarded
                </span>
              ) : null
            }
          >
            {result ? (
              <>
                <EvidenceList evidence={result.evidence} />
                {result.discardedEvidenceIds.length > 0 ? (
                  <p className="small muted" style={{ marginTop: 12, marginBottom: 0 }}>
                    The model cited evidence that was not supplied (
                    {result.discardedEvidenceIds.join(", ")}). Those citations were removed before the
                    answer was stored.
                  </p>
                ) : null}
              </>
            ) : (
              <p className="muted small" style={{ marginBottom: 0 }}>
                No AI output was stored for this investigation.
              </p>
            )}
          </Card>

          <Card
            title="Actions"
            subtitle="AI suggests; a person decides and records what was done."
            actions={
              <Link className="button button-sm" href="/actions">
                All actions
              </Link>
            }
          >
            {investigation.actions.length === 0 ? (
              <p className="muted small">No action recorded yet.</p>
            ) : (
              <div className="stack">
                {investigation.actions.map((action) => (
                  <div className="card" key={action.id} style={{ boxShadow: "none" }}>
                    <div className="row-between" style={{ marginBottom: 8 }}>
                      <strong>{action.title}</strong>
                      <StatusBadge status={action.status} />
                    </div>
                    {action.ownerName ? (
                      <p className="muted small">Owner: {action.ownerName}</p>
                    ) : null}
                    {action.completionNote ? (
                      <p className="small">Completion note: {action.completionNote}</p>
                    ) : null}
                    <ActionControls action={action} />
                    {action.status === "COMPLETED" ? (
                      <div style={{ marginTop: 12 }}>
                        <VerificationForm action={action} anomalyDate={investigation.targetDate} />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Add an action" subtitle="Record the check you intend to run.">
            <ActionCreator investigationId={investigation.id} />
          </Card>

          <Card
            title="Recorded comparisons"
            subtitle="Observed change only — other factors are not controlled."
          >
            {verifications.length === 0 ? (
              <p className="muted small" style={{ marginBottom: 0 }}>
                No before/after comparison recorded yet.
              </p>
            ) : (
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th className="num">Before</th>
                      <th className="num">After</th>
                      <th className="num">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {verifications.map((verification) => (
                      <tr key={verification.id}>
                        <td className="small">
                          {actionTitles.get(verification.actionItemId) ?? "Unknown action"}
                        </td>
                        <td className="num">
                          {verification.beforeIntensity === null
                            ? "—"
                            : verification.beforeIntensity.toFixed(4)}
                        </td>
                        <td className="num">
                          {verification.afterIntensity === null
                            ? "—"
                            : verification.afterIntensity.toFixed(4)}
                        </td>
                        <td className="num">
                          {verification.changePercent === null
                            ? "—"
                            : `${verification.changePercent.toFixed(1)}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="small muted" style={{ marginTop: 12, marginBottom: 0 }}>
              A change in intensity does not prove the action caused it.
            </p>
          </Card>

          <Card title="Provenance" subtitle="Stored so the result can be reproduced.">
            <table className="data">
              <tbody>
                <tr>
                  <td>Detection method</td>
                  <td className="num">{investigation.methodVersion}</td>
                </tr>
                <tr>
                  <td>Model</td>
                  <td className="num">{investigation.modelName ?? "not called"}</td>
                </tr>
                <tr>
                  <td>Prompt version</td>
                  <td className="num">{investigation.promptVersion ?? "—"}</td>
                </tr>
                <tr>
                  <td>Error code</td>
                  <td className="num">{investigation.errorCode ?? "—"}</td>
                </tr>
                <tr>
                  <td>Recorded at</td>
                  <td className="num">{investigation.createdAt}</td>
                </tr>
                <tr>
                  <td>Estimated cost</td>
                  <td className="num">
                    {investigation.estimatedCost === null
                      ? "—"
                      : formatCurrency(investigation.estimatedCost, investigation.currency)}
                  </td>
                </tr>
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </>
  );
}
