/** Program 4500 — Test suite manifest generator. */

import type { TestSuite } from "./types";

export function generateTestSuite(name: string): TestSuite {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return {
    framework: "vitest",
    unitTests: [
      { file: "lib/services/__tests__/auth.test.ts", description: "AuthService — login/logout/session" },
      { file: `lib/services/__tests__/${slug}.test.ts`, description: "EntityService — CRUD operations" },
      { file: "lib/utils/__tests__/permissions.test.ts", description: "RBAC permission checks" },
    ],
    integrationTests: [
      { file: "tests/api/items.test.ts", description: "API /api/items — CRUD integration" },
      { file: "tests/api/dashboard.test.ts", description: "API /api/dashboard/stats" },
      { file: "tests/api/admin.test.ts", description: "API admin endpoints — role guard" },
    ],
    e2eTests: [
      { file: "e2e/auth.spec.ts", description: "Flujo login → dashboard" },
      { file: "e2e/crud.spec.ts", description: "Crear → editar → eliminar item" },
      { file: "e2e/admin.spec.ts", description: "Panel admin — gestión usuarios" },
    ],
    coverageTarget: 80,
  };
}

export function formatTestsSummary(tests: TestSuite): string {
  const total = tests.unitTests.length + tests.integrationTests.length + tests.e2eTests.length;
  return `${total} tests · objetivo ${tests.coverageTarget}% cobertura`;
}
