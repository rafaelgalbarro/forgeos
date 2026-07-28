/** Program 4500 — Notifications panel. */

import { getExecutiveNotifications } from "@/lib/autonomous-organization";
import type { NotificationItem } from "./types";

export function buildNotificationsPanel(): NotificationItem[] {
  return getExecutiveNotifications().slice(0, 8).map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    relative: n.createdAt,
  }));
}
