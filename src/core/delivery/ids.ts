/** PROGRAM 6050 — ID helpers (string-compatible with domain brands). */

let seq = 0;

export function deliveryId(prefix: string): string {
  seq += 1;
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${t}-${seq.toString(36)}-${r}`;
}

export function resetDeliveryIdSeqForTests(): void {
  seq = 0;
}
