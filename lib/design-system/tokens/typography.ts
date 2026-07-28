/** FHIS typography scale */
export const typography = {
  fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
  fontMono: 'ui-monospace, "Cascadia Code", "SF Mono", monospace',
  sizes: {
    xs: "11px",
    sm: "12px",
    base: "14px",
    md: "15px",
    lg: "18px",
    xl: "22px",
    "2xl": "28px",
    "3xl": "36px",
  },
  weights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.65,
  },
  letterSpacing: {
    tight: "-0.02em",
    normal: "0",
    wide: "0.04em",
  },
} as const;

export type Typography = typeof typography;
