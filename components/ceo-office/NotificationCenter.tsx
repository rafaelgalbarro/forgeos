import type { NotificationCenterSnapshot } from "@/lib/notifications";
import { NotificationItem } from "@/components/ui";
import clsx from "clsx";

interface NotificationCenterProps {
  data: NotificationCenterSnapshot;
  open: boolean;
  onClose: () => void;
}

export function NotificationCenter({ data, open, onClose }: NotificationCenterProps) {
  return (
    <aside className={clsx("ceo-notif-center glass", open && "ceo-notif-center-open")}>
      <div className="ceo-notif-center-head">
        <h2>Centro de notificaciones</h2>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
          Cerrar
        </button>
      </div>
      <ul className="ceo-notif-list">
        {data.notifications.map((n) => (
          <li key={n.id}>
            <NotificationItem notification={n} />
          </li>
        ))}
      </ul>
    </aside>
  );
}
