"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getOsNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATION_SOURCE_LABELS,
  type OsNotification,
} from "@/lib/os";
import { useOsShell } from "@/lib/os/shell-context";

export function OsNotificationCenter() {
  const { notificationsOpen, setNotificationsOpen } = useOsShell();
  const [items, setItems] = useState<OsNotification[]>([]);

  useEffect(() => {
    if (notificationsOpen) setItems(getOsNotifications());
  }, [notificationsOpen]);

  if (!notificationsOpen) return null;

  function readOne(id: string) {
    markNotificationRead(id);
    setItems(getOsNotifications());
  }

  function readAll() {
    markAllNotificationsRead();
    setItems(getOsNotifications());
  }

  return (
    <div className="fhis-os-overlay" role="dialog" aria-modal aria-label="Centro de notificaciones">
      <button
        type="button"
        className="fhis-os-overlay-backdrop"
        onClick={() => setNotificationsOpen(false)}
      />
      <div className="fhis-os-notifications">
        <header className="fhis-os-notifications-head">
          <h2>Notificaciones</h2>
          <button type="button" onClick={readAll}>
            Marcar todas leídas
          </button>
        </header>
        <ul className="fhis-os-notifications-list">
          {items.map((n) => (
            <li key={n.id} className={n.read ? "read" : "unread"}>
              <span className="fhis-os-notif-source">{NOTIFICATION_SOURCE_LABELS[n.source]}</span>
              <strong>{n.title}</strong>
              <p>{n.body}</p>
              {n.href && (
                <Link href={n.href} onClick={() => readOne(n.id)}>
                  Ver detalle →
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
