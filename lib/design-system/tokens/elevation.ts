/** FHIS elevation / z-index layers */
export const elevation = {
  zBase: 0,
  zRaised: 10,
  zDropdown: 100,
  zSticky: 200,
  zOverlay: 300,
  zModal: 400,
  zToast: 500,
  zTooltip: 600,
} as const;

export type Elevation = typeof elevation;
