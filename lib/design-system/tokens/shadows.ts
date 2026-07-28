/** FHIS shadow tokens */
export const shadows = {
  none: "none",
  sm: "0 2px 8px rgba(0, 0, 0, 0.25)",
  md: "0 8px 32px rgba(0, 0, 0, 0.4)",
  lg: "0 16px 48px rgba(0, 0, 0, 0.5)",
  inner: "inset 0 1px 2px rgba(0, 0, 0, 0.3)",
} as const;

export type Shadows = typeof shadows;
