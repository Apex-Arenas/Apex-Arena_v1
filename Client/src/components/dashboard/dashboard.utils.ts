// Shared formatting helpers for the dashboard views.

/** Format a minor-unit (pesewas) amount as a GHS string, e.g. 1050 -> "GHS 10.50". */
export function formatGhs(amountMinorUnits?: number | null): string {
  const value = Number(amountMinorUnits ?? 0) / 100;
  return `GHS ${value.toFixed(2)}`;
}
