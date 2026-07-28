"use strict";exports.id=9830,exports.ids=[9830],exports.modules={12287:(a,b,c)=>{function d(a){return a.envVars.map(a=>({key:a.key,description:a.description,example:a.example,required:a.required,secret:a.secret}))}function e(a){return a.map(a=>{let b=`# ${a.description}${a.required?" (required)":""}`;return`${b}
${a.key}=${a.example}`}).join("\n\n")+"\n"}c.d(b,{a:()=>d,r:()=>e})},19394:(a,b,c)=>{c.d(b,{C:()=>e});var d=c(80083);function e(a){return a.map(a=>(0,d.ui)(a.path,a.content,a.purpose,{generatedBy:a.generatedBy,sourceArtifactIds:a.sourceArtifactIds}))}},48876:(a,b,c)=>{c.d(b,{a:()=>h});var d=c(50943),e=c(80083),f=c(70045),g=c(12287);function h(a){let b=new Date().toISOString(),c=(0,e.G0)({missionId:a.missionId,ventureId:a.ventureId,outputId:a.outputId,projectType:a.projectType,name:a.name,templateId:a.template.id,framework:a.template.stack.framework,language:a.template.stack.language}),h=(0,g.a)(a.template),i=a.files.find(a=>"README.md"===a.path)?.content??"",j=a.files.find(a=>".env.example"===a.path)?.content??(0,g.r)(h),k={...c,files:a.files,directories:(0,e.b$)(a.files),dependencies:(0,f.YJ)(a.template),scripts:Object.entries(a.template.scripts).map(([a,b])=>({name:a,command:b,purpose:`Script: ${a}`})),environmentVariables:h,routes:a.routes??[],database:a.database,api:a.api,tests:a.tests,documentation:{readme:i,envExample:j},warnings:a.warnings??[],status:"GENERATED",generationMode:a.generationMode??"template",generatedAt:b,updatedAt:b};return{...k,manifest:(0,d.zF)(k)}}},49830:(a,b,c)=>{c.d(b,{generateWebsiteProject:()=>l});var d=c(19394),e=c(48876),f=c(44887),g=c(30880),h=c(80083),i=c(62074),j=c(70045),k=c(12287);async function l(a){var b,c,l,m,n,o,p,q,r;let s=(0,f.nx)("website"),t=(0,h.Yv)(a.ventureName),u=a.modules??(0,i.I$)(a.ideaText),v="#2563eb",w={name:a.ventureName,slug:t,ventureName:a.ventureName,ideaText:a.ideaText,modules:u,brandColor:v,tagline:a.ideaText.slice(0,80),sourceArtifactIds:a.sourceArtifactIds??[]},x=(0,j.YJ)(s),y=(0,k.a)(s),z=[{slug:"",title:"Home"},{slug:"about",title:"About"},{slug:"features",title:"Features"},{slug:"contact",title:"Contact"}],A=z.filter(a=>a.slug).map(a=>{var b,c,d;return{path:`app/${a.slug}/page.tsx`,content:(b=a.title,c=w,d=u,`export default function ${b.replace(/\s/g,"")}Page() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-3xl font-bold">${b}</h1>
      <p className="mt-4 text-gray-600">${c.ventureName} — ${c.ideaText.slice(0,100)}</p>
      <ul className="mt-6 list-disc pl-6">
        ${d.map(a=>`<li>${a}</li>`).join("\n        ")}
      </ul>
    </div>
  );
}
`),purpose:`Page: ${a.title}`}}),B=(0,d.C)([{path:"package.json",content:(0,i.Jh)(t,s,x),purpose:"Project dependencies and scripts"},{path:"tsconfig.json",content:(0,i.cZ)(),purpose:"TypeScript configuration"},{path:"next.config.ts",content:`import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
};

export default config;
`,purpose:"Next.js configuration"},{path:"tailwind.config.ts",content:(b=v,`import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { brand: "${b}" },
    },
  },
  plugins: [],
};
export default config;
`),purpose:"Tailwind CSS with brand tokens"},{path:"postcss.config.mjs",content:`export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
`,purpose:"PostCSS configuration"},{path:"app/layout.tsx",content:(c=w,`import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/sections/Nav";

export const metadata: Metadata = {
  title: "${c.ventureName}",
  description: "${c.tagline?.replace(/"/g,'\\"')??c.ventureName}",
  openGraph: { title: "${c.ventureName}", description: "${c.tagline?.replace(/"/g,'\\"')??""}" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  );
}
`),purpose:"Root layout with SEO metadata"},{path:"app/page.tsx",content:(l=w,m=u,`import { Hero } from "@/components/sections/Hero";
import { Features } from "@/components/sections/Features";
import { ContactForm } from "@/components/sections/ContactForm";

export default function HomePage() {
  return (
    <>
      <Hero title="${l.ventureName}" tagline="${l.tagline?.replace(/"/g,'\\"')??""}" />
      <Features modules={${JSON.stringify(m)}} />
      <section className="mx-auto max-w-xl px-4 py-16">
        <h2 className="text-2xl font-bold mb-4">Contact us</h2>
        <ContactForm />
      </section>
    </>
  );
}
`),purpose:"Home page"},...A,{path:"app/globals.css",content:(n=v,`@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --brand: ${n};
}
`),purpose:"Global styles"},{path:"components/ui/Button.tsx",content:(0,i.xT)("Button"),purpose:"FHIS-compatible button component"},{path:"components/sections/Hero.tsx",content:`import { Button } from "@/components/ui/Button";

interface HeroProps { title: string; tagline: string; }

export function Hero({ title, tagline }: HeroProps) {
  return (
    <section className="bg-gradient-to-b from-blue-50 to-white px-4 py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{title}</h1>
      <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">{tagline}</p>
      <div className="mt-8 flex justify-center gap-4">
        <Button>Get started</Button>
        <Button variant="secondary">Learn more</Button>
      </div>
    </section>
  );
}
`,purpose:"Hero section"},{path:"components/sections/Features.tsx",content:(o=w.ventureName,`interface FeaturesProps { modules: string[]; }

export function Features({ modules }: FeaturesProps) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16">
      <h2 className="text-2xl font-bold text-center mb-8">Why ${o}?</h2>
      <div className="grid gap-6 md:grid-cols-3">
        {modules.map((mod) => (
          <div key={mod} className="rounded-lg border p-6">
            <h3 className="font-semibold capitalize">{mod.replace(/_/g, " ")}</h3>
            <p className="mt-2 text-sm text-gray-600">Streamline your {mod.replace(/_/g, " ")} workflow.</p>
          </div>
        ))}
      </div>
    </section>
  );
}
`),purpose:"Features grid"},{path:"components/sections/Nav.tsx",content:(p=z,`"use client";

import Link from "next/link";

export function Nav() {
  return (
    <header className="border-b">
      <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-4">
        <Link href="/" className="font-bold">Home</Link>
        ${p.filter(a=>a.slug).map(a=>`<Link href="/${a.slug}" className="text-gray-600 hover:text-gray-900">${a.title}</Link>`).join("\n        ")}
      </nav>
    </header>
  );
}
`),purpose:"Navigation bar"},{path:"components/sections/ContactForm.tsx",content:`"use client";

import { Button } from "@/components/ui/Button";

export function ContactForm() {
  return (
    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
      <input type="text" placeholder="Name" className="w-full rounded border px-3 py-2" required />
      <input type="email" placeholder="Email" className="w-full rounded border px-3 py-2" required />
      <textarea placeholder="Message" rows={4} className="w-full rounded border px-3 py-2" />
      <Button type="submit">Send (demo)</Button>
    </form>
  );
}
`,purpose:"Demo contact form"},{path:"lib/brand.ts",content:(q=w,`export const brand = {
  name: "${q.ventureName}",
  color: "${q.brandColor??"#2563eb"}",
  tagline: "${q.tagline?.replace(/"/g,'\\"')??""}",
} as const;
`),purpose:"Brand design tokens"},{path:"public/placeholder.svg",content:'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect fill="#e5e7eb" width="400" height="300"/><text x="200" y="150" text-anchor="middle" fill="#9ca3af" font-family="sans-serif">Placeholder</text></svg>',purpose:"Placeholder asset"},{path:".env.example",content:(0,k.r)(y),purpose:"Environment variables template"},{path:"README.md",content:(0,i.pw)(w,"Next.js 15 \xb7 TypeScript \xb7 Tailwind CSS"),purpose:"Project documentation"},{path:"tests/home.test.ts",content:(r=w.slug,`import { describe, it, expect } from "vitest";

describe("${r}", () => {
  it("has project name", () => {
    expect("${r}").toBeTruthy();
  });
});
`),purpose:"Basic smoke test"}]),C=z.map((a,b)=>({id:`route-${b}`,path:a.slug?`/${a.slug}`:"/",label:a.title,file:a.slug?`app/${a.slug}/page.tsx`:"app/page.tsx"})),D=(0,e.a)({missionId:a.missionId,ventureId:a.ventureId,outputId:a.outputId,name:a.ventureName,projectType:"website",template:s,files:B,routes:C,tests:{framework:"vitest",files:["tests/home.test.ts"]}});return(0,g.A)(D)}},50943:(a,b,c)=>{function d(a){let b={},c={};for(let d of a.dependencies)d.dev?c[d.name]=d.version:b[d.name]=d.version;let d={};for(let b of a.scripts)"dev"===b.name?d.dev=b.command:"build"===b.name?d.build=b.command:"start"===b.name?d.start=b.command:"test"===b.name&&(d.test=b.command);return d.install="npm install",{projectId:a.projectId,missionId:a.missionId,outputId:a.outputId,kind:({website:"website",web_application:"webapp",mobile:"mobile",backend:"backend",fullstack:"webapp"})[a.projectType],framework:a.framework,name:a.name,version:a.version,scripts:d,envVars:a.environmentVariables.map(a=>({key:a.key,value:a.example,source:"manifest",sensitive:a.secret})),routes:a.routes.map(a=>({path:a.path,label:a.label})),dependencies:b,devDependencies:Object.keys(c).length>0?c:void 0,declaredTests:a.tests?.files,generatedAt:a.generatedAt??a.updatedAt}}function e(a){return{...a,manifest:d(a)}}c.d(b,{dD:()=>e,zF:()=>d})}};