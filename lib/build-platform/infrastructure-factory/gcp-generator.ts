import type { GcpSpec, InfraFactoryInput } from "./types";

export function generateGcpSpec(input: InfraFactoryInput): GcpSpec {
  const slug = input.context.meta.ventureName.toLowerCase().replace(/\s+/g, "-");

  return {
    id: `gcp-${slug}`,
    adapter: "gcp",
    region: "europe-west1",
    projectId: `${slug}-gcp-placeholder`,
    resources: [
      {
        id: "cloud-run",
        service: "Cloud Run",
        name: `${slug}-service`,
        purpose: "Serverless container hosting",
        configKeys: ["cpu", "memory", "minInstances", "maxInstances"],
      },
      {
        id: "cloud-sql",
        service: "Cloud SQL",
        name: `${slug}-postgres`,
        purpose: "Managed PostgreSQL",
        configKeys: ["tier", "diskSize", "highAvailability"],
      },
      {
        id: "gcs-bucket",
        service: "Cloud Storage",
        name: `${slug}-assets`,
        purpose: "Object storage for uploads",
        configKeys: ["location", "storageClass", "lifecycleRules"],
      },
      {
        id: "load-balancer",
        service: "Cloud Load Balancing",
        name: `${slug}-lb`,
        purpose: "HTTPS load balancing",
        configKeys: ["backendServices", "sslCertificates"],
      },
    ],
    serviceAccounts: [`${slug}-app@project.iam.gserviceaccount.com`, `${slug}-worker@project.iam.gserviceaccount.com`],
    envKeys: ["GCP_PROJECT_ID", "GCP_REGION"],
    secretManagerKeys: ["database-url", "oauth-client-secret"],
  };
}
