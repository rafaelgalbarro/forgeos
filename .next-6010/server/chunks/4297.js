"use strict";exports.id=4297,exports.ids=[4297],exports.modules={12287:(a,b,c)=>{function d(a){return a.envVars.map(a=>({key:a.key,description:a.description,example:a.example,required:a.required,secret:a.secret}))}function e(a){return a.map(a=>{let b=`# ${a.description}${a.required?" (required)":""}`;return`${b}
${a.key}=${a.example}`}).join("\n\n")+"\n"}c.d(b,{a:()=>d,r:()=>e})},14297:(a,b,c)=>{c.d(b,{generateMobileProject:()=>l});var d=c(19394),e=c(48876),f=c(44887),g=c(30880),h=c(80083),i=c(62074),j=c(70045),k=c(12287);async function l(a){var b,c,l,m;let n=(0,f.nx)("mobile"),o=(0,h.Yv)(a.ventureName),p=a.modules??(0,i.I$)(a.ideaText),q={name:a.ventureName,slug:o,ventureName:a.ventureName,ideaText:a.ideaText,modules:p,sourceArtifactIds:a.sourceArtifactIds??[]},r=(0,j.YJ)(n),s=(0,k.a)(n),t=p.map(a=>({path:`app/(tabs)/${a}.tsx`,content:function(a,b){let c=(0,i.fL)(a);return`import { View, Text, FlatList, StyleSheet } from "react-native";
import { use${c}List } from "@/lib/api/client";

export default function ${c}Screen() {
  const { data, loading, offline } = use${c}List();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>${a.replace(/_/g," ")}</Text>
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
`}(a,0),purpose:`Screen: ${a}`})),u=(0,d.C)([{path:"package.json",content:(0,i.Jh)(o,n,r),purpose:"Dependencies"},{path:"tsconfig.json",content:(0,i.cZ)(),purpose:"TypeScript"},{path:"app.json",content:JSON.stringify({expo:{name:(b=q).ventureName,slug:b.slug,version:"1.0.0",orientation:"portrait",icon:"./assets/icon.png",splash:{image:"./assets/splash.png",resizeMode:"contain",backgroundColor:"#ffffff"},scheme:b.slug,plugins:["expo-router"]}},null,2),purpose:"Expo config"},{path:"app/_layout.tsx",content:`import { Stack } from "expo-router";
import { AuthProvider } from "@/lib/auth/context";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}
`,purpose:"Root layout"},{path:"app/(tabs)/_layout.tsx",content:(c=p,`import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      ${c.map(a=>`<Tabs.Screen name="${a}" options={{ title: "${(0,i.fL)(a.replace(/_/g," "))}" }} />`).join("\n      ")}
    </Tabs>
  );
}
`),purpose:"Tab navigation"},{path:"app/(tabs)/index.tsx",content:(l=q,`import { View, Text, StyleSheet } from "react-native";
import { OfflineBanner } from "@/components/OfflineBanner";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <OfflineBanner />
      <Text style={styles.title}>${l.ventureName}</Text>
      <Text style={styles.sub}>{ctx.ideaText.slice(0, 100)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "bold" },
  sub: { marginTop: 8, color: "#666" },
});
`),purpose:"Home tab"},...t,{path:"app/(auth)/login.tsx",content:`import { View, TextInput, Pressable, Text, StyleSheet } from "react-native";
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
`,purpose:"Login screen"},{path:"app/(auth)/_layout.tsx",content:`import { Stack } from "expo-router";
export default function AuthLayout() { return <Stack />; }
`,purpose:"Auth stack"},{path:"components/OfflineBanner.tsx",content:`import { Text, View, StyleSheet } from "react-native";
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
`,purpose:"Offline state UI"},{path:"components/PermissionGate.tsx",content:`import { ReactNode } from "react";
import { Text } from "react-native";

export function PermissionGate({ permission, children }: { permission: string; children: ReactNode }) {
  // Demo: always allow
  return <>{children}</>;
}
`,purpose:"Permission gate"},{path:"lib/api/client.ts",content:`const BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

async function fetchList(path: string) {
  try {
    const res = await fetch(\`\${BASE}\${path}\`);
    if (!res.ok) throw new Error("fetch failed");
    return { data: await res.json(), offline: false };
  } catch {
    return { data: [{ id: "1", name: "Cached item", status: "offline" }], offline: true };
  }
}

${["technicians","clients","work_orders","routes","inventory","billing","dashboard"].map(a=>{let b=(0,i.fL)(a);return`export function use${b}List() {
  const [state, setState] = React.useState({ data: [] as { id: string; name: string; status: string }[], loading: true, offline: false });
  React.useEffect(() => { fetchList("/${a}").then((r) => setState({ ...r, loading: false })); }, []);
  return state;
}`}).join("\n\n")}

import React from "react";
`,purpose:"API client"},{path:"lib/auth/context.tsx",content:`import React, { createContext, useState, ReactNode } from "react";

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
`,purpose:"Auth context"},{path:"lib/auth/hooks.ts",content:`import { useContext } from "react";
import { AuthContext } from "./context";

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
`,purpose:"Auth hooks"},{path:"assets/icon.png",content:"PLACEHOLDER_BINARY_ICON",purpose:"App icon placeholder"},{path:"assets/splash.png",content:"PLACEHOLDER_BINARY_SPLASH",purpose:"Splash placeholder"},{path:".env.example",content:(0,k.r)(s),purpose:"Env template"},{path:"README.md",content:(0,i.pw)(q,"Expo 52 \xb7 React Native \xb7 TypeScript"),purpose:"Docs"},{path:"__tests__/App.test.tsx",content:(m=o,`describe("${m}", () => { it("renders", () => expect("${m}").toBeTruthy()); });
`),purpose:"Smoke test"}]),v=[{id:"home",path:"/",label:"Home",file:"app/(tabs)/index.tsx"},...p.map(a=>({id:a,path:`/${a}`,label:(0,i.fL)(a.replace(/_/g," ")),file:`app/(tabs)/${a}.tsx`})),{id:"login",path:"/login",label:"Login",file:"app/(auth)/login.tsx"}],w=(0,e.a)({missionId:a.missionId,ventureId:a.ventureId,outputId:a.outputId,name:a.ventureName,projectType:"mobile",template:n,files:u,routes:v,tests:{framework:"jest",files:["__tests__/App.test.tsx"]},warnings:[{id:"w-assets",severity:"info",message:"Asset files are placeholders — replace before store submit",code:"PLACEHOLDER_ASSET"}]});return(0,g.A)(w)}},19394:(a,b,c)=>{c.d(b,{C:()=>e});var d=c(80083);function e(a){return a.map(a=>(0,d.ui)(a.path,a.content,a.purpose,{generatedBy:a.generatedBy,sourceArtifactIds:a.sourceArtifactIds}))}},48876:(a,b,c)=>{c.d(b,{a:()=>h});var d=c(50943),e=c(80083),f=c(70045),g=c(12287);function h(a){let b=new Date().toISOString(),c=(0,e.G0)({missionId:a.missionId,ventureId:a.ventureId,outputId:a.outputId,projectType:a.projectType,name:a.name,templateId:a.template.id,framework:a.template.stack.framework,language:a.template.stack.language}),h=(0,g.a)(a.template),i=a.files.find(a=>"README.md"===a.path)?.content??"",j=a.files.find(a=>".env.example"===a.path)?.content??(0,g.r)(h),k={...c,files:a.files,directories:(0,e.b$)(a.files),dependencies:(0,f.YJ)(a.template),scripts:Object.entries(a.template.scripts).map(([a,b])=>({name:a,command:b,purpose:`Script: ${a}`})),environmentVariables:h,routes:a.routes??[],database:a.database,api:a.api,tests:a.tests,documentation:{readme:i,envExample:j},warnings:a.warnings??[],status:"GENERATED",generationMode:a.generationMode??"template",generatedAt:b,updatedAt:b};return{...k,manifest:(0,d.zF)(k)}}},50943:(a,b,c)=>{function d(a){let b={},c={};for(let d of a.dependencies)d.dev?c[d.name]=d.version:b[d.name]=d.version;let d={};for(let b of a.scripts)"dev"===b.name?d.dev=b.command:"build"===b.name?d.build=b.command:"start"===b.name?d.start=b.command:"test"===b.name&&(d.test=b.command);return d.install="npm install",{projectId:a.projectId,missionId:a.missionId,outputId:a.outputId,kind:({website:"website",web_application:"webapp",mobile:"mobile",backend:"backend",fullstack:"webapp"})[a.projectType],framework:a.framework,name:a.name,version:a.version,scripts:d,envVars:a.environmentVariables.map(a=>({key:a.key,value:a.example,source:"manifest",sensitive:a.secret})),routes:a.routes.map(a=>({path:a.path,label:a.label})),dependencies:b,devDependencies:Object.keys(c).length>0?c:void 0,declaredTests:a.tests?.files,generatedAt:a.generatedAt??a.updatedAt}}function e(a){return{...a,manifest:d(a)}}c.d(b,{dD:()=>e,zF:()=>d})},62074:(a,b,c)=>{c.d(b,{I$:()=>e,Jh:()=>f,cZ:()=>g,fL:()=>i,pw:()=>h,xT:()=>j});var d=c(70045);function e(a){let b=a.toLowerCase(),c=[];for(let[a,d]of Object.entries({technicians:["t\xe9cnico","technician","campo","field"],clients:["cliente","client","customer"],work_orders:["incidencia","orden","work order","ticket","servicio"],routes:["ruta","route","dispatch"],inventory:["inventario","inventory","stock","almac\xe9n"],billing:["factura","billing","invoice","cobro"],dashboard:["dashboard","panel","m\xe9trica"],auth:["auth","login","usuario","rol"]}))d.some(a=>b.includes(a))&&c.push(a);return 0===c.length&&c.push("dashboard","auth"),c}function f(a,b,c){return JSON.stringify({name:a,version:"0.1.0",private:!0,scripts:b.scripts,dependencies:(0,d.Nu)(c),devDependencies:(0,d.eh)(c)},null,2)}function g(){return JSON.stringify({compilerOptions:{target:"ES2017",lib:["dom","dom.iterable","esnext"],allowJs:!0,skipLibCheck:!0,strict:!0,noEmit:!0,esModuleInterop:!0,module:"esnext",moduleResolution:"bundler",resolveJsonModule:!0,isolatedModules:!0,jsx:"preserve",incremental:!0,paths:{"@/*":["./*"]}},include:["**/*.ts","**/*.tsx"],exclude:["node_modules"]},null,2)}function h(a,b){return`# ${a.ventureName}

> ${a.ideaText.slice(0,120)}

Generated by ForgeOS Code Generation (template). This project is **autonomous** — no ForgeOS internals.

## Stack

${b}

## Getting started

\`\`\`bash
npm install
cp .env.example .env.local
npm run dev
\`\`\`

## Modules

${a.modules.map(a=>`- ${a}`).join("\n")}

## Notes

- Static validation only — compile verification is separate (5370)
- No real credentials — use .env.example placeholders
`}function i(a){return a.split(/[-_]/).map(a=>a.charAt(0).toUpperCase()+a.slice(1)).join("")}function j(a){return`/** FHIS-compatible inline component — autonomous, no ForgeOS imports */
import clsx from "clsx";

interface ${a}Props {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}

export function ${a}({ children, variant = "primary", onClick, type = "button", disabled }: ${a}Props) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition",
        variant === "primary" && "bg-blue-600 text-white hover:bg-blue-700",
        variant === "secondary" && "border border-gray-300 bg-white hover:bg-gray-50",
        variant === "ghost" && "text-gray-700 hover:bg-gray-100",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}
`}},70045:(a,b,c)=>{function d(a){let b=Object.entries(a.dependencies).map(([a,b])=>({name:a,version:b,dev:!1}));if(a.devDependencies)for(let[c,d]of Object.entries(a.devDependencies))b.push({name:c,version:d,dev:!0});return b}function e(a){let b={};for(let c of a.filter(a=>!a.dev))b[c.name]=c.version;return b}function f(a){let b={};for(let c of a.filter(a=>a.dev))b[c.name]=c.version;return b}c.d(b,{Nu:()=>e,YJ:()=>d,eh:()=>f})}};