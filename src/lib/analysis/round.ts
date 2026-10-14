/**
 * Deterministic rounding helper.
 *
 * Used so that identical input always produces byte-identical output, which is
 * what makes stored investigations reproducible.
 */
export function round(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
