/** FHIS color palette — maps to --fhis-color-* CSS vars */
export const colors = {
  bg: "#09090b",
  bgElevated: "#0f0f12",
  panel: "#111114",
  panelHover: "#18181c",
  text: "#fafafa",
  textMuted: "#a1a1aa",
  line: "#27272a",
  lineSubtle: "#1c1c1f",
  accent: "#a3e635",
  accentDim: "rgba(163, 230, 53, 0.1)",
  accentGlow: "rgba(163, 230, 53, 0.25)",
  accentText: "#1a2e05",
  blue: "#818cf8",
  amber: "#fbbf24",
  red: "#f87171",
  green: "#4ade80",
  white: "#ffffff",
  black: "#000000",
  transparent: "transparent",
} as const;

export type Colors = typeof colors;
