const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "Reciente";

  const diff = Date.now() - then;
  if (diff < MINUTE) return "Hace un momento";
  if (diff < HOUR) {
    const m = Math.floor(diff / MINUTE);
    return `Hace ${m} min`;
  }
  if (diff < DAY) {
    const h = Math.floor(diff / HOUR);
    return `Hace ${h} h`;
  }
  const d = Math.floor(diff / DAY);
  if (d === 1) return "Ayer";
  if (d < 7) return `Hace ${d} días`;
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });
}
