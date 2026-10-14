import { formatCurrency, formatDateLabel, formatNumber, formatSignedPercent } from "../lib/format";
import type { AnomalyCandidateDto } from "../lib/services/anomaly-service";
import { InvestigateButton } from "./client/investigate-button";
import { EmptyState, SeverityBadge } from "./ui";

/**
 * A plain SVG line chart. The caption states the range in words, so the numbers
 * are readable without looking at the graphic.
 */
/** One plotted series point. `value` is null when the day cannot be plotted. */
export interface ChartPoint {
  date: string;
  value: number | null;
  isAnomaly: boolean;
}

export function MetricChart({
  title,
  unit,
  points,
  color,
}: {
  title: string;
  unit: string;
  points: ChartPoint[];
  color: string;
}) {
  const width = 620;
  const height = 150;
  const padX = 44;
  const padTop = 14;
  const padBottom = 24;

  const values = points
    .map((point) => point.value)
    .filter((value): value is number => value !== null && Number.isFinite(value));

  const max = values.length > 0 ? Math.max(...values) : 1;
  const min = values.length > 0 ? Math.min(...values) : 0;
  const span = max - min || 1;

  const x = (index: number) =>
    padX + (index * (width - padX * 2)) / Math.max(1, points.length - 1);
  const y = (value: number) =>
    height - padBottom - ((value - min) / span) * (height - padTop - padBottom);

  const segments: string[] = [];
  let current: string[] = [];
  points.forEach((point, index) => {
    if (point.value === null || !Number.isFinite(point.value)) {
      if (current.length > 1) segments.push(current.join(" "));
      current = [];
      return;
    }
    current.push(`${x(index).toFixed(1)},${y(point.value).toFixed(1)}`);
  });
  if (current.length > 1) segments.push(current.join(" "));

  const summary =
    values.length > 0
      ? `${title} ranges from ${formatNumber(min, 1)} to ${formatNumber(max, 1)} ${unit} across ${points.length} days.`
      : `No ${title.toLowerCase()} values are available for this period.`;

  return (
    <figure style={{ margin: 0 }}>
      <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={summary}>
        <line
          x1={padX}
          y1={height - padBottom}
          x2={width - padX}
          y2={height - padBottom}
          stroke="#cbd5e1"
          strokeWidth="1"
        />
        {segments.map((segment, index) => (
          <polyline
            key={`segment-${index}`}
            points={segment}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {points.map((point, index) =>
          point.value !== null && Number.isFinite(point.value) && point.isAnomaly ? (
            <circle
              key={`marker-${point.date}`}
              cx={x(index)}
              cy={y(point.value)}
              r="4"
              fill="#b45309"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          ) : null,
        )}
        <text x={padX} y={height - 6} fontSize="11" fill="#64748b">
          {points[0]?.date ?? ""}
        </text>
        <text x={width - padX} y={height - 6} fontSize="11" fill="#64748b" textAnchor="end">
          {points[points.length - 1]?.date ?? ""}
        </text>
        <text x={padX - 8} y={y(max) + 4} fontSize="11" fill="#64748b" textAnchor="end">
          {formatNumber(max, 0)}
        </text>
        <text x={padX - 8} y={y(min) + 4} fontSize="11" fill="#64748b" textAnchor="end">
          {formatNumber(min, 0)}
        </text>
      </svg>
      <figcaption className="small muted" style={{ marginTop: 6 }}>
        {summary} Amber markers are flagged anomaly candidates.
      </figcaption>
    </figure>
  );
}

export function AnomalyQueue({
  candidates,
  companyId,
}: {
  candidates: AnomalyCandidateDto[];
  companyId: string;
}) {
  if (candidates.length === 0) {
    return (
      <EmptyState title="No anomaly candidates in this period">
        Every analyzable day stayed within the prototype threshold of the trailing baseline. Days that
        could not be analysed are listed on the Data page.
      </EmptyState>
    );
  }

  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th>Date</th>
            <th className="num">Deviation</th>
            <th>Severity</th>
            <th className="num">Estimated impact</th>
            <th>Evidence</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((candidate) => (
            <tr key={candidate.date}>
              <td className="nowrap strong">{formatDateLabel(candidate.date)}</td>
              <td className="num">{formatSignedPercent(candidate.deviationPercent, 1)}</td>
              <td>
                <SeverityBadge severity={candidate.severity} />
              </td>
              <td className="num">
                {candidate.estimatedAdditionalCost === null
                  ? "—"
                  : formatCurrency(candidate.estimatedAdditionalCost, candidate.currency)}
              </td>
              <td className="muted small" style={{ minWidth: 260 }}>
                {candidate.evidenceSummary}
              </td>
              <td>
                <InvestigateButton companyId={companyId} date={candidate.date} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
