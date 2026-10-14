import { describe, expect, it } from "vitest";

import { assessAnomaly, classifySeverity, computeDeviationPercent } from "../src/lib/analysis/anomaly-detection";
import { computeBaseline, type BaselinePoint } from "../src/lib/analysis/baseline";
import { computeCostImpact } from "../src/lib/analysis/cost-impact";
import { computeEnergyIntensity } from "../src/lib/analysis/energy-intensity";
import { analyzePeriod, type DailyOperationalRecord } from "../src/lib/analysis/metrics";
import { meanIntensityOverWindow } from "../src/lib/analysis/window-intensity";

function record(partial: Partial<DailyOperationalRecord> & { date: string }): DailyOperationalRecord {
  return {
    productionUnits: 1000,
    electricityKwh: 500,
    operatingHours: 10,
    electricityPrice: 1500,
    temperatureC: 30,
    humidityPercent: 70,
    weather: "Warm",
    sourceType: "SIMULATED",
    sourceName: "test",
    ...partial,
  };
}

describe("energy intensity", () => {
  it("divides electricity by production", () => {
    const result = computeEnergyIntensity({ electricityKwh: 500, productionUnits: 1000, operatingHours: 10 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.intensity).toBe(0.5);
      expect(result.electricityPerHour).toBe(50);
    }
  });

  it("refuses to calculate when production is zero", () => {
    const result = computeEnergyIntensity({ electricityKwh: 500, productionUnits: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("ZERO_PRODUCTION");
    }
  });

  it("treats missing values as insufficient data rather than zero", () => {
    for (const input of [
      { electricityKwh: null, productionUnits: 1000 },
      { electricityKwh: 500, productionUnits: null },
      { electricityKwh: Number.NaN, productionUnits: 1000 },
      { electricityKwh: -5, productionUnits: 1000 },
    ]) {
      const result = computeEnergyIntensity(input);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("MISSING_VALUES");
    }
  });

  it("omits electricity per hour when operating hours are unusable", () => {
    const result = computeEnergyIntensity({ electricityKwh: 500, productionUnits: 1000, operatingHours: 0 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.electricityPerHour).toBeNull();
  });
});

describe("baseline", () => {
  const series: BaselinePoint[] = [
    { date: "2026-01-01", intensity: 0.5 },
    { date: "2026-01-02", intensity: 0.5 },
    { date: "2026-01-03", intensity: 0.5 },
    { date: "2026-01-07", intensity: 0.4 },
    { date: "2026-01-08", intensity: 0.5 },
    { date: "2026-01-09", intensity: 0.6 },
  ];

  it("averages the trailing window and reports its range", () => {
    const result = computeBaseline("2026-01-10", series, { windowDays: 3, minBaselineDays: 2 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.baselineIntensity).toBe(0.5);
      expect(result.sampleSize).toBe(3);
      expect(result.from).toBe("2026-01-07");
      expect(result.to).toBe("2026-01-09");
    }
  });

  it("never includes the tested day in its own baseline", () => {
    const withSpike: BaselinePoint[] = [...series, { date: "2026-01-10", intensity: 9 }];
    const result = computeBaseline("2026-01-10", withSpike, { windowDays: 3, minBaselineDays: 2 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.baselineIntensity).toBe(0.5);
      expect(result.to).toBe("2026-01-09");
    }
  });

  it("skips days without a usable intensity", () => {
    const withGaps: BaselinePoint[] = [
      { date: "2026-01-06", intensity: 0.5 },
      { date: "2026-01-07", intensity: null },
      { date: "2026-01-08", intensity: 0.5 },
      { date: "2026-01-09", intensity: 0 },
    ];
    const result = computeBaseline("2026-01-10", withGaps, { windowDays: 5, minBaselineDays: 2 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.sampleSize).toBe(2);
  });

  it("reports insufficient baseline data instead of guessing", () => {
    const result = computeBaseline(
      "2026-01-10",
      [{ date: "2026-01-09", intensity: 0.5 }],
      { windowDays: 7, minBaselineDays: 5 },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("INSUFFICIENT_BASELINE");
      expect(result.sampleSize).toBe(1);
      expect(result.message).toContain("Insufficient baseline data");
    }
  });
});

describe("anomaly detection", () => {
  it("computes percentage deviation", () => {
    expect(computeDeviationPercent(0.72, 0.53)).toBe(35.85);
    expect(computeDeviationPercent(0.5, 0)).toBeNull();
  });

  it("maps deviation to severity bands", () => {
    expect(classifySeverity(10)).toBe("INFO");
    expect(classifySeverity(15)).toBe("LOW");
    expect(classifySeverity(25)).toBe("MEDIUM");
    expect(classifySeverity(40)).toBe("HIGH");
  });

  it("flags a day when the threshold is met or exceeded", () => {
    const atThreshold = assessAnomaly(1.15, 1, { thresholdPercent: 15 });
    expect(atThreshold.deviationPercent).toBe(15);
    expect(atThreshold.isAnomaly).toBe(true);
    expect(atThreshold.severity).toBe("LOW");
  });

  it("does not flag a day below the threshold", () => {
    const below = assessAnomaly(0.56, 0.53);
    expect(below.deviationPercent).toBe(5.66);
    expect(below.isAnomaly).toBe(false);
    expect(below.severity).toBe("INFO");
  });
});

describe("cost impact", () => {
  it("uses the documented formulas", () => {
    const impact = computeCostImpact({
      actualKwh: 700,
      productionUnits: 1000,
      baselineIntensity: 0.6,
      tariffPerKwh: 1500,
    });
    expect(impact.expectedKwh).toBe(600);
    expect(impact.potentialExcessKwh).toBe(100);
    expect(impact.estimatedAdditionalCost).toBe(150_000);
    expect(impact.formula).toContain("1,500.00");
    expect(impact.assumptions.length).toBeGreaterThan(0);
  });

  it("never produces a negative excess when actual is below the baseline", () => {
    const impact = computeCostImpact({
      actualKwh: 500,
      productionUnits: 1000,
      baselineIntensity: 0.6,
      tariffPerKwh: 1500,
    });
    expect(impact.potentialExcessKwh).toBe(0);
    expect(impact.estimatedAdditionalCost).toBe(0);
  });
});

describe("analyzePeriod", () => {
  const records: DailyOperationalRecord[] = [];
  for (let index = 0; index < 12; index += 1) {
    const day = String(index + 1).padStart(2, "0");
    // One deliberately abnormal day: same production, +36% electricity.
    const multiplier = index === 10 ? 1.36 : 1;
    records.push(
      record({
        date: `2026-01-${day}`,
        productionUnits: 1000,
        electricityKwh: 500 * multiplier,
      }),
    );
  }

  it("is deterministic for identical input", () => {
    const first = analyzePeriod(records);
    const second = analyzePeriod(records);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("flags the constructed anomaly and exposes its evidence", () => {
    const analysis = analyzePeriod(records);
    expect(analysis.anomalies).toHaveLength(1);

    const anomaly = analysis.anomalies[0];
    expect(anomaly.date).toBe("2026-01-11");
    expect(anomaly.metrics?.deviationPercent).toBe(36);
    expect(anomaly.metrics?.actualIntensity).toBe(0.68);
    expect(anomaly.metrics?.baselineIntensity).toBe(0.5);
    expect(anomaly.metrics?.potentialExcessKwh).toBe(180);
    expect(anomaly.metrics?.baselineSampleSize).toBe(7);
  });

  it("reports insufficient data for days before a baseline can exist", () => {
    const analysis = analyzePeriod(records);
    expect(analysis.insufficient.length).toBeGreaterThan(0);
    expect(analysis.insufficient[0].date).toBe("2026-01-01");
    expect(analysis.insufficient[0].reason).toContain("Insufficient baseline data");
  });

  it("marks the period as simulated when any record is simulated", () => {
    expect(analyzePeriod(records).summary.simulated).toBe(true);
  });
});

describe("meanIntensityOverWindow", () => {
  const records: DailyOperationalRecord[] = [
    record({ date: "2026-02-01", productionUnits: 1000, electricityKwh: 500 }),
    record({ date: "2026-02-02", productionUnits: 1000, electricityKwh: 600 }),
    record({ date: "2026-02-03", productionUnits: 1000, electricityKwh: 700 }),
  ];

  it("averages usable days inside the window", () => {
    const result = meanIntensityOverWindow(records, "2026-02-01", "2026-02-02");
    expect(result.ok).toBe(true);
    expect(result.meanIntensity).toBe(0.55);
    expect(result.sampleSize).toBe(2);
  });

  it("reports insufficient data when no day in the window is usable", () => {
    const withZeroProduction = [record({ date: "2026-02-04", productionUnits: 0 })];
    const result = meanIntensityOverWindow(withZeroProduction, "2026-02-04", "2026-02-04");
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("Insufficient data");
  });
});
