/**
 * Weather is an optional context signal, never a proof of cause.
 *
 * Every reading is tagged with where it came from so the UI can distinguish a
 * simulated value from a live provider value, and so a missing reading never
 * silently becomes a zero.
 */

export type WeatherStatus = "SIMULATED" | "LIVE" | "UNAVAILABLE";

export interface WeatherContext {
  status: WeatherStatus;
  /** Provider identifier, e.g. `mock-weather-v1`. */
  provider: string;
  /** True only when the reading came from a real provider. */
  isLive: boolean;
  /** ISO timestamp the reading is valid for. */
  observedAt: string;
  temperatureC: number | null;
  humidityPercent: number | null;
  condition: string | null;
  /** Why the reading is unavailable or simulated, if worth stating. */
  note: string | null;
}

export interface WeatherRequest {
  /** `YYYY-MM-DD` */
  date: string;
  location?: string | null;
}

export interface WeatherProvider {
  readonly name: string;
  readonly isLive: boolean;
  getDailyWeather(request: WeatherRequest): Promise<WeatherContext>;
}

export function unavailableWeather(reason: string): WeatherContext {
  return {
    status: "UNAVAILABLE",
    provider: "none",
    isLive: false,
    observedAt: new Date(0).toISOString(),
    temperatureC: null,
    humidityPercent: null,
    condition: null,
    note: reason,
  };
}
