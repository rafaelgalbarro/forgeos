/**
 * PROGRAM 6085 — Type entry for exclusive lock (runtime is .js for Node scripts).
 * @see ./exclusive-execution-lock.js
 */
export type ExclusiveLockRecord = {
  owner: string;
  command: string;
  pid: number;
  timestamp: string;
  heartbeatAt?: string;
  hostname?: string;
  cwd?: string;
  path?: string;
};

export type AcquireResult =
  | { ok: true; record: ExclusiveLockRecord }
  | { ok: false; error: string; existing?: ExclusiveLockRecord };

// Runtime implementation lives in exclusive-execution-lock.js (CommonJS for kill:ports).
