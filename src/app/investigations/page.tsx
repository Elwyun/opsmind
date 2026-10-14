import Link from "next/link";

import { AnomalyQueue } from "../../components/dashboard";
import { SetupNotice } from "../../components/setup-notice";
import { Card, EmptyState, SeverityBadge, StatusBadge } from "../../components/ui";
import { formatCurrency, formatDateLabel, formatSignedPercent } from "../../lib/format";
import { getAnomalyCandidates, getDashboardSummary } from "../../lib/services/anomaly-service";
import { getPrimaryCompany } from "../../lib/services/company-service";
import { listInvestigations } from "../../lib/services/investigation-service";

export const dynamic = "force-dynamic";

export default async function InvestigationsPage() {
  const company = await getPrimaryCompany();
  if (!company) return <SetupNotice />;

  const [candidates, investigations, summary] = await Promise.all([
    getAnomalyCandidates({ companyId: company.id }),
    listInvestigations({ companyId: company.id }),
    getDashboardSummary({ companyId: company.id }),
  ]);

  return (
    <>
      <div className="page-head">
        <h1>Investigations</h1>
        <p>
          Pick a candidate and run an investigation. The app calculates the metrics, then asks the model
          to explain the evidence and suggest checks a person can carry out.
        </p>
      </div>

      <Card
        title="Investigation queue"
        subtitle={`Flagged when intensity is at least ${summary.thresholdPercent}% above the trailing baseline (method ${summary.methodVersion}).`}
      >
        <AnomalyQueue candidates={candidates} companyId={company.id} />
      </Card>

      <Card
        title="Investigations run"
        subtitle="Re-running the same day replaces its stored result, so the queue stays one row per day."
      >
        {investigations.length === 0 ? (
          <EmptyState title="No investigations yet">
            Start from a candidate above. The run is stored so its evidence can be reopened later.
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Target date</th>
                  <th>Status</th>
                  <th>Severity</th>
                  <th className="num">Deviation</th>
                  <th className="num">Estimated impact</th>
                  <th>Model</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {investigations.map((investigation) => (
                  <tr key={investigation.id}>
                    <td className="nowrap strong">{formatDateLabel(investigation.targetDate)}</td>
                    <td>
                      <StatusBadge status={investigation.status} />
                    </td>
                    <td>
                      <SeverityBadge severity={investigation.severity} />
                    </td>
                    <td className="num">
                      {investigation.deviationPercent === null
                        ? "—"
                        : formatSignedPercent(investigation.deviationPercent, 1)}
                    </td>
                    <td className="num">
                      {investigation.estimatedCost === null
                        ? "—"
                        : formatCurrency(investigation.estimatedCost, investigation.currency)}
                    </td>
                    <td className="small">
                      {investigation.modelName ?? "—"}
                      {investigation.result && !investigation.result.isLive ? (
                        <div className="muted">simulated mock</div>
                      ) : null}
                    </td>
                    <td>
                      <Link className="button button-sm" href={`/investigations/${investigation.id}`}>
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
