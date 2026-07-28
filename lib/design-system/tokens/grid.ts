/** FHIS grid system */
export const grid = {
  columns: 12,
  gutter: "24px",
  gutterSm: "16px",
  gutterLg: "32px",
  maxWidth: "1280px",
  maxWidthSm: "640px",
  maxWidthMd: "768px",
  maxWidthLg: "1024px",
  maxWidthXl: "1280px",
  breakpoints: {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
  },
} as const;

export type Grid = typeof grid;
