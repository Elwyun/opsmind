import { prisma } from "../db";
import { parseDateKey } from "../date";
import { buildDemoDataset } from "../demo/seed-data";

export interface ResetDemoResult {
  companyId: string;
  companyName: string;
  days: number;
}

/**
 * Restores the demo to a clean, deterministic state.
 *
 * Deleting the company's investigations cascades to their action items and
 * verifications, so a rehearsal always starts from the same point. Everything
 * written here is re-labelled SIMULATED.
 */
export async function resetDemoData(): Promise<ResetDemoResult> {
  const dataset = buildDemoDataset();

  const existingCompany = await prisma.company.findFirst({
    where: { name: dataset.company.name },
  });

  const company =
    existingCompany ??
    (await prisma.company.create({
      data: { name: dataset.company.name, location: dataset.company.location },
    }));

  await prisma.investigation.deleteMany({ where: { companyId: company.id } });
  await prisma.dailyOperationalData.deleteMany({ where: { companyId: company.id } });

  for (const day of dataset.days) {
    await prisma.dailyOperationalData.create({
      data: {
        companyId: company.id,
        date: parseDateKey(day.date),
        productionUnits: day.productionUnits,
        electricityKwh: day.electricityKwh,
        operatingHours: day.operatingHours,
        temperatureC: day.temperatureC,
        humidityPercent: day.humidityPercent,
        weather: day.weather,
        electricityPrice: day.electricityPrice,
        sourceType: day.sourceType,
        sourceName: day.sourceName,
      },
    });
  }

  return { companyId: company.id, companyName: company.name, days: dataset.days.length };
}
