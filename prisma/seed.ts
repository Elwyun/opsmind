import "dotenv/config";

import { prisma } from "../src/lib/db";
import { parseDateKey, toDateKey } from "../src/lib/date";
import { buildDemoDataset } from "../src/lib/demo/seed-data";

/**
 * Seeds the deterministic demo dataset. Idempotent: running it twice does not
 * duplicate records. Run `npm run demo:reset` for a clean slate.
 *
 * All seeded rows are labelled SIMULATED (`sourceType: SIMULATED`).
 */
async function main(): Promise<void> {
  const dataset = buildDemoDataset();

  const existing = await prisma.company.findFirst({
    where: { name: dataset.company.name },
  });

  const company =
    existing ??
    (await prisma.company.create({
      data: {
        name: dataset.company.name,
        location: dataset.company.location,
      },
    }));

  for (const day of dataset.days) {
    const date = parseDateKey(day.date);
    await prisma.dailyOperationalData.upsert({
      where: { companyId_date: { companyId: company.id, date } },
      update: {
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
      create: {
        companyId: company.id,
        date,
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

  const stored = await prisma.dailyOperationalData.count({ where: { companyId: company.id } });

  console.log("OpsMind seed complete.");
  console.log(`  company     : ${company.name} (${company.id})`);
  console.log(`  seeded days : ${dataset.days.length}`);
  console.log(`  stored days : ${stored}`);
  console.log(
    `  period      : ${toDateKey(parseDateKey(dataset.days[0].date))} .. ${dataset.days[dataset.days.length - 1].date}`,
  );
  console.log(`  anomaly day : ${dataset.anomalyDate} (simulated)`);
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
