/** FHIS brand identity — single source for Forge Human Interface System */
export const brand = {
  name: "ForgeOS",
  shortName: "Forge",
  tagline: "Venture Studio",
  system: "FHIS",
  systemFull: "Forge Human Interface System",
  version: "0.4",
} as const;

export type Brand = typeof brand;
