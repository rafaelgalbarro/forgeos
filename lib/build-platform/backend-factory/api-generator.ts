import type { ApiEndpointSpec, ApiSpec, BackendFactoryInput } from "./types";

function slugFromVenture(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "venture";
}

export function generateApiPlan(input: BackendFactoryInput): ApiSpec {
  const ventureSlug = slugFromVenture(input.context.meta.ventureName);
  const style = input.registry.preferredApiStyle;
  const generatorId = style === "trpc" ? "gen-trpc-router" : "gen-api-route";

  const baseEndpoints: ApiEndpointSpec[] = [
    {
      id: "api-health",
      method: "GET",
      path: "/api/health",
      purpose: "Liveness probe for deployment and monitoring.",
      auth: "public",
      serviceId: "svc-health",
      responseShape: "{ status: 'ok', ventureId: string }",
    },
    {
      id: "api-vehicles-list",
      method: "GET",
      path: `/api/${ventureSlug}/vehicles`,
      purpose: "List fleet vehicles with pagination and filters.",
      auth: "authenticated",
      serviceId: "svc-vehicle",
      requestShape: "{ page?: number, status?: string }",
      responseShape: "{ items: Vehicle[], total: number }",
    },
    {
      id: "api-vehicles-create",
      method: "POST",
      path: `/api/${ventureSlug}/vehicles`,
      purpose: "Register a new vehicle in the fleet.",
      auth: "authenticated",
      serviceId: "svc-vehicle",
      requestShape: "{ plate: string, model: string, batteryCapacityKwh: number }",
      responseShape: "{ vehicle: Vehicle }",
    },
    {
      id: "api-vehicle-detail",
      method: "GET",
      path: `/api/${ventureSlug}/vehicles/:id`,
      purpose: "Fetch a single vehicle with telemetry summary.",
      auth: "authenticated",
      serviceId: "svc-vehicle",
      responseShape: "{ vehicle: Vehicle, telemetry: TelemetrySummary }",
    },
    {
      id: "api-fleet-metrics",
      method: "GET",
      path: `/api/${ventureSlug}/fleet/metrics`,
      purpose: "Aggregate fleet KPIs for dashboard consumption.",
      auth: "authenticated",
      serviceId: "svc-fleet-metrics",
      responseShape: "{ activeVehicles: number, avgBattery: number, alerts: number }",
    },
    {
      id: "api-auth-session",
      method: "POST",
      path: "/api/auth/session",
      purpose: "Establish authenticated session via configured auth provider.",
      auth: "public",
      serviceId: "svc-auth",
      requestShape: "{ provider: string, token: string }",
      responseShape: "{ session: Session, permissions: string[] }",
    },
  ];

  const moduleEndpoints: ApiEndpointSpec[] = input.dna.modules
    .filter((module) => module !== "core")
    .map((module) => ({
      id: `api-module-${module}`,
      method: "GET" as const,
      path: `/api/${ventureSlug}/${module}`,
      purpose: `Workspace API surface for the ${module} module.`,
      auth: "authenticated" as const,
      serviceId: `svc-${module}`,
      responseShape: `{ module: '${module}', status: string }`,
    }));

  return {
    id: "api-main",
    basePath: "/api",
    style,
    generatorId,
    endpoints: [...baseEndpoints, ...moduleEndpoints],
  };
}
