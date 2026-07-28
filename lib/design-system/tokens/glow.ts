/** FHIS glow / accent halo tokens */
export const glow = {
  accent: "0 0 24px rgba(163, 230, 53, 0.25)",
  accentStrong: "0 0 40px rgba(163, 230, 53, 0.4)",
  blue: "0 0 24px rgba(129, 140, 248, 0.25)",
  red: "0 0 24px rgba(248, 113, 113, 0.25)",
  none: "none",
} as const;

export type Glow = typeof glow;
