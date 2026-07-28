/**
 * @see ./port-registry.js
 */
export type PortRegistryEntry = {
  port: number;
  pid: number;
  role?: string;
  missionId?: string | null;
  sandboxId?: string | null;
  registeredAt?: string;
};
