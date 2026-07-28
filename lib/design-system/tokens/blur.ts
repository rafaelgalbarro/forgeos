/** FHIS backdrop blur tokens */
export const blur = {
  none: "0",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "40px",
} as const;

export type Blur = typeof blur;
