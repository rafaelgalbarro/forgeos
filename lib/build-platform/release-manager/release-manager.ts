import { buildReleasePackage } from "./release-builder";
import type { BuildReleasePackageInput, ReleasePackage } from "./types";
import { validateReleasePackage } from "./release-validator";

export interface ReleaseManager {
  buildReleasePackage(input: BuildReleasePackageInput): ReleasePackage;
  validateReleasePackage(pkg: ReleasePackage): ReturnType<typeof validateReleasePackage>;
}

class ReleaseManagerEngine implements ReleaseManager {
  buildReleasePackage(input: BuildReleasePackageInput): ReleasePackage {
    return buildReleasePackage(input);
  }

  validateReleasePackage(pkg: ReleasePackage) {
    return validateReleasePackage(pkg);
  }
}

export function createReleaseManager(): ReleaseManager {
  return new ReleaseManagerEngine();
}
