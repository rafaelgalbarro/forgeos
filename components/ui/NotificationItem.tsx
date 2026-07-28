import Link from "next/link";
/** @deprecated Legacy wrapper — prefer @/components/ui/fhis/Notification */
import clsx from "clsx";
import type { ForgeNotification } from "@/lib/notifications";

interface NotificationItemProps {
  notification: ForgeNotification;
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const content = (
    <>
      <div className="ui-notif-head">
        <strong>{notification.title}</strong>
        {!notification.read && <span className="ui-notif-unread" aria-label="No leída" />}
      </div>
      <p>{notification.body}</p>
      {notification.ventureName && (
        <span className="ui-notif-venture">{notification.ventureName}</span>
      )}
    </>
  );

  if (notification.href) {
    return (
      <Link
        href={notification.href}
        className={clsx("ui-notif-item", `ui-notif-${notification.priority}`, !notification.read && "ui-notif-new")}
      >
        {content}
      </Link>
    );
  }

  return (
    <div className={clsx("ui-notif-item", `ui-notif-${notification.priority}`)}>{content}</div>
  );
}
