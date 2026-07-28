import { createReleaseManager } from "@/lib/build-platform/release-manager";
import type { ReleasePackage } from "@/lib/build-platform/release-manager";
import { createLabMockVenture } from "@/lib/lab/mock-venture";

export function generateReleaseManagerLabPackage(): ReleasePackage {
  const venture = createLabMockVenture();
  const manager = createReleaseManager();
  return manager.buildReleasePackage({ venture });
}
