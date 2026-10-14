import { describe, expect, it } from "vitest";

import { analyzePeriod, type DailyOperationalRecord } from "../src/lib/analysis/metrics";
import {
  DEMO_ANOMALY_DATE,
  DEMO_DAY_COUNT,
  DEMO_SECONDARY_ANOMALY_DATE,
  buildDemoDataset,
} from "../src/lib/demo/seed-data";

function toRecords(): DailyOperationalRecord[] {
  return buildDemoDataset().days.map((day) => ({
    date: day.date,
    productionUnits: day.productionUnits,
    electricityKwh: day.electricityKwh,
    operatingHours: day.operatingHours,
    electricityPrice: day.electricityPrice,
    temperatureC: day.temperatureC,
    humidityPercent: day.humidityPercent,
    weather: day.weather,
    sourceType: day.sourceType,
    sourceName: day.sourceName,
  }));
}

describe("demo dataset", () => {
  it("produces exactly 30 days", () => {
    const dataset = buildDemoDataset();
    expect(dataset.days).toHaveLength(DEMO_DAY_COUNT);
    expect(dataset.days[0].date).toBe("2026-09-01");
    expect(dataset.days[DEMO_DAY_COUNT - 1].date).toBe("2026-09-30");
  });

  it("is reproducible between builds", () => {
    expect(JSON.stringify(buildDemoDataset())).toBe(JSON.stringify(buildDemoDataset()));
  });

  it("labels every row as simulated", () => {
    for (const day of buildDemoDataset().days) {
      expect(day.sourceType).toBe("SIMULATED");
      expect(day.sourceName).toBe("synthetic-seed-v1");
    }
  });

  it("keeps production flat on the anomaly day while electricity rises", () => {
    const dataset = buildDemoDataset();
    const anomaly = dataset.days.find((day) => day.date === DEMO_ANOMALY_DATE);
    const previous = dataset.days.find((day) => day.date === "2026-09-16");
    expect(anomaly).toBeDefined();
    expect(previous).toBeDefined();
    if (!anomaly || !previous) return;

    const before = previous.electricityKwh / previous.productionUnits;
    const at = anomaly.electricityKwh / anomaly.productionUnits;
    expect(at / before).toBeGreaterThan(1.3);
    expect(anomaly.productionUnits).toBeGreaterThan(900);
  });

  it("records the simulated warm spell around the anomaly date", () => {
    const dataset = buildDemoDataset();
    const anomaly = dataset.days.find((day) => day.date === DEMO_ANOMALY_DATE);
    expect(anomaly?.temperatureC).toBeGreaterThanOrEqual(31.5);
  });
});

describe("engine over the demo dataset", () => {
  const analysis = analyzePeriod(toRecords());

  it("finds the two intended candidates and nothing else", () => {
    expect(analysis.anomalies.map((day) => day.date)).toEqual([
      DEMO_ANOMALY_DATE,
      DEMO_SECONDARY_ANOMALY_DATE,
    ]);
  });

  it("reports the headline deviation of 36% on the primary anomaly", () => {
    const primary = analysis.anomalies[0];
    expect(primary.metrics?.deviationPercent).toBe(36);
    expect(primary.metrics?.severity).toBe("MEDIUM");
    expect(primary.metrics?.baselineSampleSize).toBe(7);
    expect(primary.metrics?.potentialExcessKwh).toBeCloseTo(192.589, 3);
  });

  it("estimates cost from the excess and the recorded tariff", () => {
    const primary = analysis.anomalies[0];
    expect(primary.metrics?.tariffPerKwh).toBe(1500);
    expect(primary.metrics?.estimatedAdditionalCost).toBeCloseTo(288_884.17, 2);
  });

  it("reports the first five days as insufficient baseline data", () => {
    expect(analysis.insufficient.map((day) => day.date)).toEqual([
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
    ]);
  });

  it("marks the whole period as simulated", () => {
    expect(analysis.summary.simulated).toBe(true);
    expect(analysis.summary.anomalyCount).toBe(2);
  });
});
