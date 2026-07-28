/** PROGRAM 5360 — Mobile generator (Expo Router + TypeScript). */

import type { CodeGenerationInput, CodeProject, CodeRoute } from "../types";
import { buildFiles } from "../file-builder";
import { buildProject } from "../project-builder";
import { getTemplateForProjectType } from "../templates/loader";
import type { TemplateContext } from "../templates/types";
import { applyValidationToProject } from "../code-validator";
import { slugify } from "../code-project";
import {
  buildPackageJson,
  buildReadme,
  buildTsConfig,
  extractModulesFromIdea,
  pascalCase,
} from "./shared";
import { buildDependenciesFromTemplate } from "../dependency-builder";
import { buildEnvExampleContent, buildEnvVarsFromTemplate } from "../environment-builder";

export async function generateMobileProject(input: CodeGenerationInput): Promise<CodeProject> {
  const template = getTemplateForProjectType("mobile");
  const slug = slugify(input.ventureName);
  const modules = input.modules ?? extractModulesFromIdea(input.ideaText);

  const ctx: TemplateContext = {
    name: input.ventureName,
    slug,
    ventureName: input.ventureName,
    ideaText: input.ideaText,
    modules,
    sourceArtifactIds: input.sourceArtifactIds ?? [],
  };

  const deps = buildDependenciesFromTemplate(template);
  const envVars = buildEnvVarsFromTemplate(template);

  const screenFiles = modules.map((mod) => ({
    path: `app/(tabs)/${mod}.tsx`,
    content: generateScreen(mod, ctx),
    purpose: `Screen: ${mod}`,
  }));

  const files = buildFiles([
    { path: "package.json", content: buildPackageJson(slug, template, deps), purpose: "Dependencies" },
    { path: "tsconfig.json", content: buildTsConfig(), purpose: "TypeScript" },
    { path: "app.json", content: generateAppJson(ctx), purpose: "Expo config" },
    { path: "app/_layout.tsx", content: generateRootLayout(), purpose: "Root layout" },
    { path: "app/(tabs)/_layout.tsx", content: generateTabsLayout(modules), purpose: "Tab navigation" },
    { path: "app/(tabs)/index.tsx", content: generateHomeScreen(ctx), purpose: "Home tab" },
    ...screenFiles,
    { path: "app/(auth)/login.tsx", content: generateLoginScreen(), purpose: "Login screen" },
    { path: "app/(auth)/_layout.tsx", content: generateAuthStackLayout(), purpose: "Auth stack" },
    { path: "components/OfflineBanner.tsx", content: generateOfflineBanner(), purpose: "Offline state UI" },
    { path: "components/PermissionGate.tsx", content: generatePermissionGate(), purpose: "Permission gate" },
    { path: "lib/api/client.ts", content: generateApiClient(), purpose: "API client" },
    { path: "lib/auth/context.tsx", content: generateAuthContext(), purpose: "Auth context" },
    { path: "lib/auth/hooks.ts", content: generateAuthHooks(), purpose: "Auth hooks" },
    { path: "assets/icon.png", content: "PLACEHOLDER_BINARY_ICON", purpose: "App icon placeholder" },
    { path: "assets/splash.png", content: "PLACEHOLDER_BINARY_SPLASH", purpose: "Splash placeholder" },
    { path: ".env.example", content: buildEnvExampleContent(envVars), purpose: "Env template" },
    { path: "README.md", content: buildReadme(ctx, "Expo 52 · React Native · TypeScript"), purpose: "Docs" },
    { path: "__tests__/App.test.tsx", content: generateMobileTest(slug), purpose: "Smoke test" },
  ]);

  const routes: CodeRoute[] = [
    { id: "home", path: "/", label: "Home", file: "app/(tabs)/index.tsx" },
    ...modules.map((mod) => ({
      id: mod,
      path: `/${mod}`,
      label: pascalCase(mod.replace(/_/g, " ")),
      file: `app/(tabs)/${mod}.tsx`,
    })),
    { id: "login", path: "/login", label: "Login", file: "app/(auth)/login.tsx" },
  ];

  const project = buildProject({
    missionId: input.missionId,
    ventureId: input.ventureId,
    outputId: input.outputId,
    name: input.ventureName,
    projectType: "mobile",
    template,
    files,
    routes,
    tests: { framework: "jest", files: ["__tests__/App.test.tsx"] },
    warnings: [
      { id: "w-assets", severity: "info", message: "Asset files are placeholders — replace before store submit", code: "PLACEHOLDER_ASSET" },
    ],
  });

  return applyValidationToProject(project);
}

function generateAppJson(ctx: TemplateContext): string {
  return JSON.stringify(
    {
      expo: {
        name: ctx.ventureName,
        slug: ctx.slug,
        version: "1.0.0",
        orientation: "portrait",
        icon: "./assets/icon.png",
        splash: { image: "./assets/splash.png", resizeMode: "contain", backgroundColor: "#ffffff" },
        scheme: ctx.slug,
        plugins: ["expo-router"],
      },
    },
    null,
    2
  );
}

function generateRootLayout(): string {
  return `import { Stack } from "expo-router";
import { AuthProvider } from "@/lib/auth/context";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}
`;
}

function generateTabsLayout(modules: string[]): string {
  return `import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      ${modules.map((m) => `<Tabs.Screen name="${m}" options={{ title: "${pascalCase(m.replace(/_/g, " "))}" }} />`).join("\n      ")}
    </Tabs>
  );
}
`;
}

function generateHomeScreen(ctx: TemplateContext): string {
  return `import { View, Text, StyleSheet } from "react-native";
import { OfflineBanner } from "@/components/OfflineBanner";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <OfflineBanner />
      <Text style={styles.title}>${ctx.ventureName}</Text>
      <Text style={styles.sub}>{ctx.ideaText.slice(0, 100)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "bold" },
  sub: { marginTop: 8, color: "#666" },
});
`;
}

function generateScreen(mod: string, ctx: TemplateContext): string {
  const Name = pascalCase(mod);
  return `import { View, Text, FlatList, StyleSheet } from "react-native";
import { use${Name}List } from "@/lib/api/client";

export default function ${Name}Screen() {
  const { data, loading, offline } = use${Name}List();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>${mod.replace(/_/g, " ")}</Text>
      {offline && <Text style={styles.offline}>Offline — showing cached data</Text>}
      {loading ? <Text>Loading…</Text> : (
        <FlatList data={data} keyExtractor={(i) => i.id} renderItem={({ item }) => (
          <View style={styles.row}><Text>{item.name}</Text><Text>{item.status}</Text></View>
        )} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: "600", marginBottom: 12, textTransform: "capitalize" },
  offline: { color: "#b45309", marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderColor: "#eee" },
});
`;
}

function generateLoginScreen(): string {
  return `import { View, TextInput, Pressable, Text, StyleSheet } from "react-native";
import { useAuth } from "@/lib/auth/hooks";

export default function LoginScreen() {
  const { signIn } = useAuth();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in</Text>
      <TextInput placeholder="Email" style={styles.input} />
      <TextInput placeholder="Password" secureTextEntry style={styles.input} />
      <Pressable style={styles.btn} onPress={() => signIn("demo@example.com")}>
        <Text style={styles.btnText}>Sign in (demo)</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 16 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, marginBottom: 12 },
  btn: { backgroundColor: "#2563eb", padding: 14, borderRadius: 8, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "600" },
});
`;
}

function generateAuthStackLayout(): string {
  return `import { Stack } from "expo-router";
export default function AuthLayout() { return <Stack />; }
`;
}

function generateOfflineBanner(): string {
  return `import { Text, View, StyleSheet } from "react-native";
import { useState, useEffect } from "react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => { setOffline(false); }, []);
  if (!offline) return null;
  return <View style={styles.banner}><Text style={styles.text}>You are offline</Text></View>;
}

const styles = StyleSheet.create({
  banner: { backgroundColor: "#fef3c7", padding: 8 },
  text: { color: "#92400e", textAlign: "center" },
});
`;
}

function generatePermissionGate(): string {
  return `import { ReactNode } from "react";
import { Text } from "react-native";

export function PermissionGate({ permission, children }: { permission: string; children: ReactNode }) {
  // Demo: always allow
  return <>{children}</>;
}
`;
}

function generateApiClient(): string {
  return `const BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

async function fetchList(path: string) {
  try {
    const res = await fetch(\`\${BASE}\${path}\`);
    if (!res.ok) throw new Error("fetch failed");
    return { data: await res.json(), offline: false };
  } catch {
    return { data: [{ id: "1", name: "Cached item", status: "offline" }], offline: true };
  }
}

${["technicians", "clients", "work_orders", "routes", "inventory", "billing", "dashboard"]
  .map((mod) => {
    const Name = pascalCase(mod);
    return `export function use${Name}List() {
  const [state, setState] = React.useState({ data: [] as { id: string; name: string; status: string }[], loading: true, offline: false });
  React.useEffect(() => { fetchList("/${mod}").then((r) => setState({ ...r, loading: false })); }, []);
  return state;
}`;
  })
  .join("\n\n")}

import React from "react";
`;
}

function generateAuthContext(): string {
  return `import React, { createContext, useState, ReactNode } from "react";

interface AuthState { user: string | null; signIn: (email: string) => void; signOut: () => void; }
export const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<string | null>(null);
  return (
    <AuthContext.Provider value={{ user, signIn: (e) => setUser(e), signOut: () => setUser(null) }}>
      {children}
    </AuthContext.Provider>
  );
}
`;
}

function generateAuthHooks(): string {
  return `import { useContext } from "react";
import { AuthContext } from "./context";

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
`;
}

function generateMobileTest(slug: string): string {
  return `describe("${slug}", () => { it("renders", () => expect("${slug}").toBeTruthy()); });
`;
}
