/** Software plan generator — frontend/backend/database/UX (dry-run) */

import type { IdeaProfile } from "../idea-context";
import type { SoftwarePlan } from "../types";

export function generateSoftwarePlan(profile: IdeaProfile): SoftwarePlan {
  if (profile.isPremiumGlasses) {
    return {
      frontend: {
        framework: "Next.js 15 App Router + FHIS",
        pages: ["/", "/catalogo", "/configurador", "/checkout", "/admin"],
        components: ["ProductCard", "Configurator", "TryOnWidget", "CartDrawer", "OrderTable"],
      },
      backend: {
        framework: "Next.js API Routes",
        routes: ["/api/products", "/api/orders", "/api/checkout", "/api/webhooks/stripe"],
        services: ["ProductService", "OrderService", "PaymentService"],
      },
      database: {
        engine: "PostgreSQL (Supabase)",
        tables: ["products", "variants", "orders", "order_items", "customers"],
        migrations: "001_init_schema.sql — products, orders, RLS policies",
      },
      ux: {
        flows: ["Descubrir → Configurar → Pagar → Confirmar", "Admin: pedidos → fulfillment"],
        wireframes: ["Hero landing", "Grid catálogo", "Configurator 3-step", "Checkout 2-col"],
      },
    };
  }

  return {
    frontend: {
      framework: "Next.js 15",
      pages: ["/", "/dashboard", "/settings"],
      components: ["Dashboard", "Sidebar", "KpiCards"],
    },
    backend: {
      framework: "Next.js API Routes",
      routes: ["/api/auth", "/api/data"],
      services: ["AuthService", "DataService"],
    },
    database: {
      engine: "PostgreSQL",
      tables: ["users", "projects", "events"],
      migrations: "001_init.sql",
    },
    ux: {
      flows: ["Signup → Onboarding → Dashboard"],
      wireframes: ["Landing", "Dashboard grid"],
    },
  };
}
