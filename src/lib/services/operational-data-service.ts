import { assertRangeOrder } from "../api/validation";
import { prisma } from "../db";
import { parseDateKey, toDateKey } from "../date";
import { toDailyRecord } from "../serializers";
import { serializeOperationalData, type OperationalDataDto } from "../serializers";
import type { DailyOperationalRecord } from "../analysis/metrics";

export interface OperationalDataQuery {
  companyId: string;
  from?: string;
  to?: string;
}

/**
 * The engine consumes plain records. It is deliberately given the full series
 * so a baseline is always built from the same data set and stays reproducible.
 */
export async function listDailyRecords(
  companyId: string,
  range: { from?: string; to?: string } = {},
): Promise<DailyOperationalRecord[]> {
  const rows = await prisma.dailyOperationalData.findMany({
    where: {
      companyId,
      ...(range.from || range.to
        ? {
            date: {
              ...(range.from ? { gte: parseDateKey(range.from) } : {}),
              ...(range.to ? { lte: parseDateKey(range.to) } : {}),
            },
          }
        : {}),
    },
    orderBy: { date: "asc" },
  });
  return rows.map(toDailyRecord);
}

export async function listOperationalData(query: OperationalDataQuery): Promise<OperationalDataDto[]> {
  if (query.from && query.to) {
    assertRangeOrder(query.from, query.to, "date range");
  }

  const rows = await prisma.dailyOperationalData.findMany({
    where: {
      companyId: query.companyId,
      ...(query.from || query.to
        ? {
            date: {
              ...(query.from ? { gte: parseDateKey(query.from) } : {}),
              ...(query.to ? { lte: parseDateKey(query.to) } : {}),
            },
          }
        : {}),
    },
    orderBy: { date: "asc" },
  });

  return rows.map(serializeOperationalData);
}

export async function countOperationalData(companyId: string): Promise<number> {
  return prisma.dailyOperationalData.count({ where: { companyId } });
}

/** First and last stored dates, used by the header period label. */
export async function getDataBounds(
  companyId: string,
): Promise<{ from: string | null; to: string | null }> {
  const [first, last] = await Promise.all([
    prisma.dailyOperationalData.findFirst({
      where: { companyId },
      orderBy: { date: "asc" },
      select: { date: true },
    }),
    prisma.dailyOperationalData.findFirst({
      where: { companyId },
      orderBy: { date: "desc" },
      select: { date: true },
    }),
  ]);

  return {
    from: first ? toDateKey(first.date) : null,
    to: last ? toDateKey(last.date) : null,
  };
}
