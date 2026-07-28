/**
 * @see ./process-registry.js
 */
export type ProcessRegistryEntry = {
  pid: number;
  command: string;
  role?: string;
  port?: number | null;
  missionId?: string | null;
  sandboxId?: string | null;
  owner?: string;
  registeredAt?: string;
  alive?: boolean;
};
