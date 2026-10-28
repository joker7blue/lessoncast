// How the pipeline graph prints durations and costs.

export function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return rest ? `${minutes} min ${rest} s` : `${minutes} min`;
}

export function formatUsd(usd: number): string {
  const digits = usd < 0.1 ? 3 : 2;
  // Round half up: 0.0465 is stored just below itself in binary and toFixed alone gives 0.046.
  const rounded = Math.round((usd + Number.EPSILON) * 10 ** digits) / 10 ** digits;
  return `$${rounded.toFixed(digits)}`;
}
