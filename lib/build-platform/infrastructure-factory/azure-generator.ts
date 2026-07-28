import type { AzureSpec, InfraFactoryInput } from "./types";

export function generateAzureSpec(input: InfraFactoryInput): AzureSpec {
  const slug = input.context.meta.ventureName.toLowerCase().replace(/\s+/g, "-");

  return {
    id: `azure-${slug}`,
    adapter: "azure",
    region: "westeurope",
    resourceGroup: `rg-${slug}`,
    resources: [
      {
        id: "app-service",
        service: "App Service",
        name: `app-${slug}`,
        purpose: "Web application hosting",
        configKeys: ["sku", "runtimeStack", "alwaysOn"],
      },
      {
        id: "postgres-flex",
        service: "Azure Database for PostgreSQL",
        name: `db-${slug}`,
        purpose: "Managed PostgreSQL",
        configKeys: ["skuName", "storageSize", "backupRetention"],
      },
      {
        id: "storage-account",
        service: "Storage Account",
        name: `st${slug.replace(/-/g, "")}`,
        purpose: "Blob storage for assets",
        configKeys: ["accountTier", "replicationType"],
      },
      {
        id: "key-vault",
        service: "Key Vault",
        name: `kv-${slug}`,
        purpose: "Secrets and certificate management",
        configKeys: ["sku", "softDeleteRetention"],
      },
    ],
    managedIdentities: [`id-${slug}-app`, `id-${slug}-worker`],
    envKeys: ["AZURE_SUBSCRIPTION_ID", "AZURE_TENANT_ID", "AZURE_CLIENT_ID"],
    keyVaultKeys: ["database-connection-string", "stripe-secret-key"],
  };
}
