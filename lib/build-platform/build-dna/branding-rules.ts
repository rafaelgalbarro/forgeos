/** Default branding rules for generated software (Epic 6.1). */

import type { BrandingRules } from "./types";

export const DEFAULT_BRANDING_RULES: BrandingRules = {
  primaryColor: "#2563eb",
  fontFamily: "Inter, system-ui, sans-serif",
  rules: [
    "Use venture brand tokens when provided by Build Context",
    "Fallback to FHIS design system tokens for UI consistency",
    "Logo and favicon must be optimized (SVG preferred)",
    "Accessible color contrast (WCAG AA minimum)",
    "Consistent typography scale across all screens",
  ],
};
