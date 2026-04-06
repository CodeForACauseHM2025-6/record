export const SCALE_FACTORS: Record<string, number> = {
  S: 0.75,
  M: 1,
  L: 1.25,
  XL: 1.5,
};

export function scalePx(base: number, scale?: string | null): number {
  return Math.round(base * (SCALE_FACTORS[scale ?? "M"] ?? 1));
}
