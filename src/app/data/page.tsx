import { SetupNotice } from "../../components/setup-notice";
import { Card, Notice, SeverityBadge } from "../../components/ui";
import { analyzePeriod } from "../../lib/analysis/metrics";
import { isDateKey } from "../../lib/date";
import { formatNumber, formatSignedPercent } from "../../lib/format";
import { getPrimaryCompany } from "../../lib/services/company-service";
import {
  getDataBounds,
  listDailyRecords,
  listOperationalData,
} from "../../lib/services/operational-data-service";

export const dynamic = "force-dynamic";

export default async function DataPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const company = await getPrimaryCompany();
  if (!company) return <SetupNotice />;

  const params = await searchParams;
  const bounds = await getDataBounds(company.id);

  const from = isDateKey(params.from) ? params.from : (bounds.from ?? undefined);
  const to = isDateKey(params.to) ? params.to : (bounds.to ?? undefined);

  const [rows, records] = await Promise.all([
    listOperationalData({ companyId: company.id, from, to }),
    // The engine always sees the full series so baselines stay consistent.
    listDailyRecords(company.id),
  ]);

  const analysis = analyzePeriod(records);
  const analysisByDate = new Map(analysis.days.map((day) => [day.date, day]));

  return (
    <>
      <div className="page-head">
        <h1>Data</h1>
        <p>
          Stored daily operational data. Every row carries its source label so simulated and measured
          values are never confused.
        </p>
      </div>

      <Notice tone="warning" title="Source labels">
        Rows marked <strong>SIMULATED</strong> come from the deterministic demo dataset. A real
        deployment would show MANUAL, CSV_IMPORT, WEATHER_API or SENSOR rows here.
      </Notice>

      <Card
        title="Filter"
        subtitle={
          bounds.from && bounds.to
            ? `Available range: ${bounds.from} → ${bounds.to}`
            : "No data available"
        }
      >
        <form method="get" className="row" style={{ alignItems: "flex-end" }}>
          <label className="field" style={{ maxWidth: 200 }}>
            From
            <input type="date" name="from" defaultValue={from ?? ""} />
          </label>
          <label className="field" style={{ maxWidth: 200 }}>
            To
            <input type="date" name="to" defaultValue={to ?? ""} />
          </label>
          <button type="submit" className="button">
            Apply filter
          </button>
        </form>
      </Card>

      <Card
        title="Daily operational data"
        subtitle={`${rows.length} row(s). Days that cannot produce an intensity are shown as "insufficient".`}
      >
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Date</th>
                <th className="num">Production</th>
                <th className="num">Electricity</th>
                <th className="num">Intensity</th>
                <th className="num">Baseline</th>
                <th className="num">Deviation</th>
                <th>Status</th>
                <th>Weather</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const day = analysisByDate.get(row.date);
                const metrics = day?.status === "OK" ? day.metrics : null;
                return (
                  <tr key={row.id}>
                    <td className="nowrap">{row.date}</td>
                    <td className="num">{formatNumber(row.productionUnits)}</td>
                    <td className="num">{formatNumber(row.electricityKwh, 1)}</td>
                    <td className="num">{metrics ? metrics.actualIntensity.toFixed(3) : "—"}</td>
                    <td className="num">{metrics ? metrics.baselineIntensity.toFixed(3) : "—"}</td>
                    <td className="num">
                      {metrics ? formatSignedPercent(metrics.deviationPercent, 1) : "—"}
                    </td>
                    <td>
                      {metrics?.isAnomaly ? (
                        <SeverityBadge severity={metrics.severity} />
                      ) : day?.status === "INSUFFICIENT_DATA" ? (
                        <span className="badge badge-muted">Insufficient data</span>
                      ) : (
                        <span className="badge badge-muted">Within threshold</span>
                      )}
                    </td>
                    <td className="small">
                      {row.weather ?? "—"}
                      {row.temperatureC === null ? "" : ` · ${formatNumber(row.temperatureC, 1)}°C`}
                    </td>
                    <td className="small">{row.sourceType}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
