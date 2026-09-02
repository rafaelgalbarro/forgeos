/** Program 4500 — Quick actions. */

import type { QuickAction } from "./types";

export const COMMAND_CENTER_QUICK_ACTIONS: QuickAction[] = [
  { id: "new-venture", label: "Nueva Venture", href: "/venture-factory", variant: "primary" },
  { id: "ceo", label: "Abrir CEO", href: "/organization", variant: "secondary" },
  { id: "build", label: "Crear Build", href: "/deployments", variant: "secondary" },
  { id: "investment", label: "Investment", href: "/investment", variant: "secondary" },
  { id: "capital", label: "Abrir Capital", href: "/capital", variant: "secondary" },
  { id: "marketplace", label: "Marketplace", href: "/marketplace", variant: "secondary" },
  { id: "deploy", label: "Deploy", href: "/deployments", variant: "secondary" },
  { id: "self-evolution", label: "Self Evolution", href: "/self-evolution", variant: "secondary" },
];
