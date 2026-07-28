/** PROGRAM 4255 — Creation card route availability (static, no runtime scan). */

export interface CreationRoute {
  id: string;
  href: string;
  available: boolean;
}

export const CREATION_ROUTES: Record<string, CreationRoute> = {
  empresa: { id: "empresa", href: "/founder", available: true },
  web: { id: "web", href: "/website-factory", available: true },
  app: { id: "app", href: "/application-factory", available: true },
  mobile: { id: "mobile", href: "/mobile-factory", available: true },
};
