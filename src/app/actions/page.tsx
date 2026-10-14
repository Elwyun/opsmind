import Link from "next/link";

import { SetupNotice } from "../../components/setup-notice";
import { Card, EmptyState, KpiCard, StatusBadge } from "../../components/ui";
import { formatDateLabel } from "../../lib/format";
import { listActions } from "../../lib/services/action-service";
import { getPrimaryCompany } from "../../lib/services/company-service";
import { listInvestigations } from "../../lib/services/investigation-service";

export const dynamic = "force-dynamic";

export default async function ActionsPage() {
  const company = await getPrimaryCompany();
  if (!company) return <SetupNotice />;

  const [actions, investigations] = await Promise.all([
    listActions({ companyId: company.id }),
    listInvestigations({ companyId: company.id }),
  ]);

  const investigationById = new Map(investigations.map((row) => [row.id, row]));
  const countOf = (status: string) => actions.filter((action) => action.status === status).length;

  return (
    <>
      <div className="page-head">
        <h1>Actions</h1>
        <p>
          What people decided to check or change, and what happened next. Status changes are recorded
          with a timestamp by the backend.
        </p>
      </div>

      <div className="grid grid-3">
        <KpiCard label="Open" value={String(countOf("OPEN"))} unit="not started" tone="warning" />
        <KpiCard label="In progress" value={String(countOf("IN_PROGRESS"))} unit="underway" tone="neutral" />
        <KpiCard label="Completed" value={String(countOf("COMPLETED"))} unit="finished" />
      </div>

      <Card title="All actions" subtitle="Newest first.">
        {actions.length === 0 ? (
          <EmptyState title="No actions recorded">
            Open an investigation and add the checks you plan to run.
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Related investigation</th>
                  <th>Status</th>
                  <th>Owner</th>
                  <th>Created</th>
                  <th>Completion note</th>
                </tr>
              </thead>
              <tbody>
                {actions.map((action) => {
                  const investigation = investigationById.get(action.investigationId);
                  return (
                    <tr key={action.id}>
                      <td className="strong">{action.title}</td>
                      <td>
                        {investigation ? (
                          <Link href={`/investigations/${investigation.id}`}>
                            {formatDateLabel(investigation.targetDate)}
                          </Link>
                        ) : (
                          <span className="muted">unavailable</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={action.status} />
                      </td>
                      <td className="small">{action.ownerName ?? "—"}</td>
                      <td className="small nowrap">{action.createdAt.slice(0, 10)}</td>
                      <td className="small muted">{action.completionNote ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
