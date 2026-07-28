/** Program 4600 — Screen definitions generator. */

import type { NavigationStructure, ScreenDefinition, Template } from "./types";

export function generateScreens(
  template: Template,
  navigation: NavigationStructure
): ScreenDefinition[] {
  const authScreens =
    template.category === "saas" || template.category === "fintech"
      ? [
          createScreen("Login", "Login", "/login", true, "Pantalla de inicio de sesión"),
          createScreen("Register", "Registro", "/register", false, "Registro de nueva cuenta"),
        ]
      : [];

  const mainScreens = navigation.routes.map((route) =>
    createScreen(
      route.name,
      route.title,
      `/${route.name.toLowerCase()}`,
      navigation.authGuarded,
      `Pantalla principal: ${route.title}`
    )
  );

  const utilityScreens: ScreenDefinition[] = [
    createScreen("Splash", "Splash", "/", false, "Pantalla de carga inicial"),
    createScreen("NotFound", "404", "/not-found", false, "Pantalla de error"),
  ];

  return [...utilityScreens, ...authScreens, ...mainScreens];
}

function createScreen(
  name: string,
  title: string,
  route: string,
  requiresAuth: boolean,
  description: string
): ScreenDefinition {
  return {
    id: `screen-${name.toLowerCase()}`,
    name,
    title,
    route,
    component: `${name}Screen`,
    requiresAuth,
    description,
  };
}

export function formatScreensSummary(screens: ScreenDefinition[]): string {
  const auth = screens.filter((s) => s.requiresAuth).length;
  return `${screens.length} pantallas · ${auth} protegidas`;
}
