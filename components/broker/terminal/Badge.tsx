import type { ReactNode } from "react";
import styles from "./terminal.module.css";

export type BadgeTone = "green" | "blue" | "gray" | "amber" | "red";

const TONE_CLASS: Record<BadgeTone, string> = {
  green: styles.badgeGreen,
  blue: styles.badgeBlue,
  gray: styles.badgeGray,
  amber: styles.badgeAmber,
  red: styles.badgeRed,
};

export function TerminalBadge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: BadgeTone;
}) {
  return <span className={`${styles.badge} ${TONE_CLASS[tone]}`}>{children}</span>;
}
