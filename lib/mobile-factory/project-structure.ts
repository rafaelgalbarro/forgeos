/** Program 4600 — Expo/RN project structure manifest generator. */

import type { ProjectStructureManifest, ScreenDefinition, Template } from "./types";

export function generateProjectStructure(
  template: Template,
  projectSlug: string,
  screens: ScreenDefinition[]
): ProjectStructureManifest {
  const screenFiles = screens.map((s) => ({
    path: `src/screens/${s.component}.tsx`,
    kind: "source" as const,
    description: s.description,
  }));

  const files = [
    { path: "app.json", kind: "config" as const, description: "Configuración Expo" },
    { path: "package.json", kind: "config" as const, description: "Dependencias del proyecto" },
    { path: "tsconfig.json", kind: "config" as const, description: "TypeScript config" },
    { path: "App.tsx", kind: "source" as const, description: "Entry point React Native" },
    { path: "src/navigation/RootNavigator.tsx", kind: "source" as const, description: "Navegación raíz" },
    { path: "src/lib/api-client.ts", kind: "source" as const, description: "Cliente API" },
    { path: "src/lib/auth-context.tsx", kind: "source" as const, description: "Contexto de autenticación" },
    { path: "src/hooks/useAuth.ts", kind: "source" as const, description: "Hook de autenticación" },
    { path: "assets/icon.png", kind: "asset" as const, description: "Icono de la app" },
    { path: "assets/splash.png", kind: "asset" as const, description: "Splash screen" },
    ...screenFiles,
    { path: "__tests__/App.test.tsx", kind: "test" as const, description: "Test de smoke" },
  ];

  return {
    framework: "expo",
    entryPoint: "App.tsx",
    files,
    dependencies: {
      expo: "~52.0.0",
      "react-native": "0.76.x",
      "@react-navigation/native": "^7.0.0",
      "@react-navigation/bottom-tabs": "^7.0.0",
      "@react-navigation/native-stack": "^7.0.0",
      "expo-secure-store": "~14.0.0",
      "expo-router": "~4.0.0",
    },
    scripts: {
      start: "expo start",
      android: "expo run:android",
      ios: "expo run:ios",
      web: "expo start --web",
      test: "jest",
    },
  };
}

export function formatStructureSummary(structure: ProjectStructureManifest): string {
  return `${structure.files.length} archivos · Expo ${structure.dependencies.expo}`;
}
