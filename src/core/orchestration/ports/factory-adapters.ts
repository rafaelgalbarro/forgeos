/** PROGRAM 6030 — Factory adapters (thin; dynamic import / fixtures). */

import type { CapabilityRequest, CapabilityResult } from "../../domain/capabilities";
import { fixtureCapabilityResult } from "./runtime-scheduler-port";

function realEnabled(flag: string): boolean {
  const v = process.env[flag];
  return v === "1" || v === "true";
}

export interface FactoryAdapter {
  name: string;
  invoke(request: CapabilityRequest): Promise<CapabilityResult>;
}

async function tryDynamic<T>(loader: () => Promise<T>): Promise<T | null> {
  try {
    return await loader();
  } catch {
    return null;
  }
}

export const VentureFactoryAdapter: FactoryAdapter = {
  name: "VentureFactoryAdapter",
  async invoke(request) {
    if (!realEnabled("ENABLE_REAL_VENTURE_FACTORY")) {
      return fixtureCapabilityResult("GenerateMarketResearch", {
        venture: { name: "Generic Venture", status: "planned" },
      });
    }
    const mod = await tryDynamic(() => import("@/lib/venture-factory"));
    return {
      ...fixtureCapabilityResult("GenerateMarketResearch", {
        moduleLoaded: Boolean(mod),
        note: "Thin adapter — pipeline not auto-executed from React",
      }),
      usedFixture: !mod,
      warnings: mod ? ["Venture factory module resolved"] : ["Venture factory unavailable"],
    };
  },
};

export const BrandFactoryAdapter: FactoryAdapter = {
  name: "BrandFactoryAdapter",
  async invoke(request) {
    if (!realEnabled("ENABLE_REAL_BRAND_FACTORY")) {
      return fixtureCapabilityResult("GenerateBrand", {
        brand: { name: "Forge Brand", tagline: "Ship with clarity" },
      });
    }
    const mod = await tryDynamic(() => import("@/lib/venture-factory/brand-generator"));
    return {
      ...fixtureCapabilityResult("GenerateBrand", { moduleLoaded: Boolean(mod) }),
      usedFixture: !mod,
    };
  },
};

export const WebsiteFactoryAdapter: FactoryAdapter = {
  name: "WebsiteFactoryAdapter",
  async invoke() {
    if (!realEnabled("ENABLE_REAL_WEBSITE_FACTORY")) {
      return fixtureCapabilityResult("GenerateWebsite", {
        website: { pages: ["home", "pricing"], preview: true },
      });
    }
    const mod = await tryDynamic(() => import("@/lib/website-factory"));
    return {
      ...fixtureCapabilityResult("GenerateWebsite", { moduleLoaded: Boolean(mod) }),
      usedFixture: !mod,
    };
  },
};

export const ApplicationFactoryAdapter: FactoryAdapter = {
  name: "ApplicationFactoryAdapter",
  async invoke() {
    if (!realEnabled("ENABLE_REAL_APPLICATION_FACTORY")) {
      return fixtureCapabilityResult("GenerateWebApplication", {
        app: { routes: ["/dashboard", "/settings"], preview: true },
      });
    }
    const mod = await tryDynamic(() => import("@/lib/application-factory"));
    return {
      ...fixtureCapabilityResult("GenerateWebApplication", { moduleLoaded: Boolean(mod) }),
      usedFixture: !mod,
    };
  },
};

export const MobileFactoryAdapter: FactoryAdapter = {
  name: "MobileFactoryAdapter",
  async invoke() {
    if (!realEnabled("ENABLE_REAL_MOBILE_FACTORY")) {
      return fixtureCapabilityResult("GenerateMobileApplication", {
        mobile: { screens: ["home", "profile"], expo: true },
      });
    }
    const mod = await tryDynamic(() => import("@/lib/mobile-factory"));
    return {
      ...fixtureCapabilityResult("GenerateMobileApplication", { moduleLoaded: Boolean(mod) }),
      usedFixture: !mod,
    };
  },
};

export const BackendFactoryAdapter: FactoryAdapter = {
  name: "BackendFactoryAdapter",
  async invoke() {
    if (!realEnabled("ENABLE_REAL_BACKEND_FACTORY")) {
      return fixtureCapabilityResult("GenerateBackend", {
        backend: { services: ["api", "auth"], blueprint: true },
      });
    }
    const mod = await tryDynamic(() => import("@/lib/build-platform/backend-factory"));
    return {
      ...fixtureCapabilityResult("GenerateBackend", { moduleLoaded: Boolean(mod) }),
      usedFixture: !mod,
    };
  },
};

export const BuildPipelineAdapter: FactoryAdapter = {
  name: "BuildPipelineAdapter",
  async invoke() {
    if (!realEnabled("ENABLE_REAL_BUILD")) {
      return fixtureCapabilityResult("BuildCodebase", {
        build: { status: "success", artifacts: ["dist/"] },
      });
    }
    const mod = await tryDynamic(() => import("@/lib/build-engine/orchestrator"));
    return {
      ...fixtureCapabilityResult("BuildCodebase", { moduleLoaded: Boolean(mod) }),
      usedFixture: !mod,
    };
  },
};

export const PreviewRuntimeAdapter: FactoryAdapter = {
  name: "PreviewRuntimeAdapter",
  async invoke() {
    if (!realEnabled("ENABLE_REAL_PREVIEW")) {
      return fixtureCapabilityResult("CreatePreview", {
        preview: { url: "http://127.0.0.1:0/preview-fixture", sandbox: false },
      });
    }
    const mod = await tryDynamic(() => import("@/lib/preview-runtime"));
    return {
      ...fixtureCapabilityResult("CreatePreview", { moduleLoaded: Boolean(mod) }),
      usedFixture: !mod,
    };
  },
};

export const DeploymentAdapter: FactoryAdapter = {
  name: "DeploymentAdapter",
  async invoke() {
    if (!realEnabled("ENABLE_REAL_DEPLOY")) {
      return fixtureCapabilityResult("DeployRelease", {
        deployment: {
          environment: "preview",
          productionActivated: false,
          url: "http://127.0.0.1:0/deploy-preview-fixture",
        },
      });
    }
    const mod = await tryDynamic(() => import("@/lib/preview-deployment"));
    return {
      ...fixtureCapabilityResult("DeployRelease", {
        moduleLoaded: Boolean(mod),
        productionActivated: false,
      }),
      usedFixture: !mod,
    };
  },
};

export const CodebaseAdapter: FactoryAdapter = {
  name: "CodebaseAdapter",
  async invoke() {
    if (!realEnabled("ENABLE_REAL_CODEGEN")) {
      return fixtureCapabilityResult("GenerateCodebase", {
        codebase: { files: 12, monorepo: true },
      });
    }
    const mod = await tryDynamic(() => import("@/lib/code-generation"));
    return {
      ...fixtureCapabilityResult("GenerateCodebase", { moduleLoaded: Boolean(mod) }),
      usedFixture: !mod,
    };
  },
};

export const FACTORY_ADAPTERS = {
  VentureFactoryAdapter,
  BrandFactoryAdapter,
  WebsiteFactoryAdapter,
  ApplicationFactoryAdapter,
  MobileFactoryAdapter,
  BackendFactoryAdapter,
  BuildPipelineAdapter,
  PreviewRuntimeAdapter,
  DeploymentAdapter,
  CodebaseAdapter,
} as const;
