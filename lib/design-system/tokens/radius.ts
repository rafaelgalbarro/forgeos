/** FHIS border radius tokens */
export const radius = {
  none: "0",
  sm: "6px",
  md: "10px",
  lg: "16px",
  xl: "20px",
  full: "9999px",
} as const;

export type Radius = typeof radius;
