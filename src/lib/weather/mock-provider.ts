import { mockWeatherForDate } from "./mock-weather";
import type { WeatherContext, WeatherProvider, WeatherRequest } from "./provider";

export const MOCK_WEATHER_PROVIDER_NAME = "mock-weather-v1";

/**
 * Deterministic provider used until a real weather source is chosen.
 *
 * Roadmap M3 requires checking a real provider's coverage, terms, limits and
 * attribution before wiring it in. Until then this provider is clearly marked
 * SIMULATED everywhere it appears, and is never described as live weather.
 */
export class MockWeatherProvider implements WeatherProvider {
  readonly name = MOCK_WEATHER_PROVIDER_NAME;
  readonly isLive = false;

  async getDailyWeather(request: WeatherRequest): Promise<WeatherContext> {
    const reading = mockWeatherForDate(request.date);

    return {
      status: "SIMULATED",
      provider: this.name,
      isLive: false,
      observedAt: `${request.date}T12:00:00.000Z`,
      temperatureC: reading.temperatureC,
      humidityPercent: reading.humidityPercent,
      condition: reading.weather,
      note: "Simulated weather context. Not a live observation.",
    };
  }
}
