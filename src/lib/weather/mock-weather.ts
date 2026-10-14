import { round } from "../analysis/round";
import { seededRandom } from "../random";

export interface MockWeatherReading {
  temperatureC: number;
  humidityPercent: number;
  weather: string;
}

/**
 * The mock weather provider is deterministic and labelled SIMULATED wherever it
 * is used. It includes a short simulated warm spell so the demo has a plausible
 * (but explicitly simulated) weather signal to reason about.
 */
const WARM_SPELL_DATES = new Set(["2026-09-16", "2026-09-17", "2026-09-18"]);
const WARM_SPELL_BUMP_C = 2.5;

/**
 * Deterministic simulated weather for a calendar day.
 * Range: 28–35 °C, 65–88 % humidity.
 */
export function mockWeatherForDate(dateKey: string): MockWeatherReading {
  const random = seededRandom(`opsmind-weather:${dateKey}`);

  const baseTemperature = 29 + random() * 4; // 29–33
  const temperatureC = round(
    baseTemperature + (WARM_SPELL_DATES.has(dateKey) ? WARM_SPELL_BUMP_C : 0),
    2,
  );
  const humidityPercent = round(66 + random() * 20, 2);

  const weather = pickCondition(temperatureC, humidityPercent, random());

  return { temperatureC, humidityPercent, weather };
}

function pickCondition(temperatureC: number, humidityPercent: number, roll: number): string {
  if (temperatureC >= 32 && humidityPercent < 82) return "Hot";
  if (roll < 0.18) return "Cloudy";
  if (roll < 0.3) return "Light rain";
  if (humidityPercent >= 82) return "Humid";
  return "Warm";
}
