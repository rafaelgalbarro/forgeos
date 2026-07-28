/** PROGRAM 5360 — Client-safe output type → project kind mapping. */

import type { CreationOutputType } from "@/lib/creation-output/types";
import type { CodeProjectKind } from "./types";

const OUTPUT_KIND_MAP: Partial<Record<CreationOutputType, CodeProjectKind>> = {
  WEBSITE_OUTPUT: "website",
  WEB_APPLICATION_OUTPUT: "webapp",
  MOBILE_APPLICATION_OUTPUT: "mobile",
  BACKEND_OUTPUT: "backend",
  DEPLOYMENT_OUTPUT: "deployment",
};

export function outputTypeToKind(type: CreationOutputType): CodeProjectKind | null {
  return OUTPUT_KIND_MAP[type] ?? null;
}
