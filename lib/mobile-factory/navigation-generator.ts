/** Program 4600 — Navigation structure generator. */

import type { NavigationStructure, Template } from "./types";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function generateNavigation(
  template: Template,
  projectName: string
): NavigationStructure {
  const slug = slugify(projectName);
  const routes = template.defaultScreens.map((screen, i) => {
    const name = screen.replace(/\s+/g, "");
    return {
      name,
      title: screen,
      icon: tabIconForScreen(screen, i),
      screen: `${name}Screen`,
    };
  });

  return {
    type: template.defaultNav,
    root: template.defaultNav === "tabs" ? "MainTabs" : "RootStack",
    routes,
    authGuarded: template.category === "saas" || template.category === "fintech",
  };
}

function tabIconForScreen(screen: string, index: number): string {
  const icons: Record<string, string> = {
    Home: "home",
    Dashboard: "grid",
    Feed: "rss",
    Profile: "user",
    Settings: "settings",
    Login: "log-in",
    Cart: "shopping-cart",
    Wallet: "credit-card",
    Messages: "message-circle",
    Today: "calendar",
  };
  return icons[screen] ?? ["circle", "square", "triangle", "star", "heart"][index % 5];
}

export function formatNavigationSummary(nav: NavigationStructure): string {
  return `${nav.type} · ${nav.routes.length} rutas · ${nav.authGuarded ? "con auth guard" : "público"}`;
}
