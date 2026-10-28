// Standard-mode prices in USD, from https://dev.meta.ai/docs/pricing-rate-limits (26 October 2026).

export const PRICES = {
  sparkInputPerMTok: 1.25,
  sparkCachedInputPerMTok: 0.15,
  sparkOutputPerMTok: 4.25,
} as const;

export const IMAGE_COST_USD = 0.01;

export type SparkUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  prompt_tokens_details?: { cached_tokens?: number };
};

export function sparkCostUsd(usage: SparkUsage | undefined): number {
  if (!usage) return 0;
  const cached = usage.prompt_tokens_details?.cached_tokens ?? 0;
  return (
    ((usage.prompt_tokens - cached) * PRICES.sparkInputPerMTok +
      cached * PRICES.sparkCachedInputPerMTok +
      usage.completion_tokens * PRICES.sparkOutputPerMTok) /
    1e6
  );
}
