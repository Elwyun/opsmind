import { MOCK_WEATHER_PROVIDER_NAME, MockWeatherProvider } from "./mock-provider";
import { unavailableWeather, type WeatherContext, type WeatherProvider } from "./provider";

export * from "./provider";
export { MockWeatherProvider, MOCK_WEATHER_PROVIDER_NAME } from "./mock-provider";
export { mockWeatherForDate } from "./mock-weather";

/**
 * Returns the configured weather provider.
 *
 * Only the mock provider is wired up. A real provider joins here once its
 * coverage, terms, rate limits and attribution requirements are confirmed
 * (roadmap M3). Selecting a real provider is a one-line change because the
 * rest of the app depends on the `WeatherProvider` interface only.
 */
export function getWeatherProvider(): WeatherProvider {
  return new MockWeatherProvider();
}

/**
 * Fetches weather context without letting a provider failure break an
 * investigation. On failure the result is explicitly UNAVAILABLE.
 */
export async function safeGetDailyWeather(
  provider: WeatherProvider,
  date: string,
  location?: string | null,
): Promise<WeatherContext> {
  try {
    return await provider.getDailyWeather({ date, location });
  } catch {
    return unavailableWeather(
      `Weather context could not be retrieved from ${provider.name}. The investigation continues without it.`,
    );
  }
}
