export type NotificationType =
  | "research_done"
  | "risk"
  | "competitor"
  | "build_ready"
  | "discovery"
  | "simulator"
  | "ceo";

export type NotificationPriority = "high" | "medium" | "low";

export interface ForgeNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  ventureId?: string;
  ventureName?: string;
  priority: NotificationPriority;
  href?: string;
  timestamp: string;
  read: boolean;
}

export interface NotificationCenterSnapshot {
  notifications: ForgeNotification[];
  unreadCount: number;
}
