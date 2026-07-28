"use strict";exports.id=7044,exports.ids=[7044],exports.modules={17044:(a,b,c)=>{c.d(b,{generateWebsitePreview:()=>f});var d=c(80723);function e(a){return a.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function f(a){let b=(0,d.ZS)(a.templateId),c=a.pages.length>0?a.pages:[{slug:"home",title:a.name,purpose:a.idea.description,sections:["Hero","Features","CTA"]}],f=c.map(a=>`<a href="#${a.slug}" class="wf-nav-link">${e(a.title)}</a>`).join(""),g=c.map(b=>(function(a,b){let c=b.brand,d=a.sections.map(a=>(function(a,b,c){let d=e(a),f=e(b||`Contenido de ${a}`);return`
    <section class="wf-section" data-section="${d.toLowerCase()}">
      <h2 style="color:${c.primaryColor}">${d}</h2>
      <p>${f}</p>
    </section>`})(a,b.copyBlocks[a]??b.copyBlocks.hero??"",c)).join("\n");return`
    <article class="wf-page" data-slug="${a.slug}">
      <header class="wf-page-header">
        <h1>${e(a.title)}</h1>
        <p class="wf-muted">${e(a.purpose)}</p>
      </header>
      ${d}
    </article>`})(b,a)).join("\n<hr/>\n");return{html:`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${e(a.seo.title||a.name)}</title>
  <meta name="description" content="${e(a.seo.description)}"/>
  <style>
    :root {
      --wf-primary: ${a.brand.primaryColor};
      --wf-secondary: ${a.brand.secondaryColor};
      --wf-font: ${a.brand.fontFamily}, system-ui, sans-serif;
    }
    body { font-family: var(--wf-font); margin: 0; color: #1a1a1a; background: #fafafa; }
    .wf-header { background: var(--wf-primary); color: #fff; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; }
    .wf-nav { display: flex; gap: 1rem; }
    .wf-nav-link { color: #fff; text-decoration: none; opacity: 0.9; }
    .wf-hero { padding: 3rem 2rem; text-align: center; background: linear-gradient(135deg, var(--wf-primary), var(--wf-secondary)); color: #fff; }
    .wf-hero h1 { font-size: 2.5rem; margin: 0 0 0.5rem; }
    .wf-hero p { opacity: 0.9; max-width: 560px; margin: 0 auto; }
    .wf-main { max-width: 960px; margin: 0 auto; padding: 2rem; }
    .wf-section { margin: 2rem 0; padding: 1.5rem; background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .wf-muted { color: #666; }
    .wf-footer { text-align: center; padding: 2rem; color: #888; font-size: 0.875rem; }
    .wf-tagline { font-style: italic; opacity: 0.85; }
  </style>
</head>
<body>
  <header class="wf-header">
    <strong>${e(a.name)}</strong>
    <nav class="wf-nav">${f}</nav>
  </header>
  <div class="wf-hero">
    <h1>${e(a.idea.title||a.name)}</h1>
    <p class="wf-tagline">${e(a.brand.tagline)}</p>
    <p>${e(a.idea.description)}</p>
  </div>
  <main class="wf-main">
    ${g}
  </main>
  <footer class="wf-footer">
    ${e(a.name)} \xb7 Template: ${e(b?.name??a.templateId)} \xb7 ForgeOS Website Factory
  </footer>
</body>
</html>`,title:a.name,pageCount:c.length,componentCount:a.components.length}}},80723:(a,b,c)=>{c.d(b,{ZS:()=>e});let d=[{id:"landing-saas",name:"Landing SaaS",category:"saas",description:"Landing page moderna para producto SaaS con hero, features y pricing.",tags:["saas","b2b","conversion"],defaultPages:["home","pricing","about"],suggestedComponents:["Hero","FeatureGrid","PricingTable","CTA","Footer"]},{id:"portfolio-creative",name:"Portfolio Creativo",category:"portfolio",description:"Showcase visual para dise\xf1adores, fot\xf3grafos y creativos.",tags:["portfolio","creativo","personal"],defaultPages:["home","work","about","contact"],suggestedComponents:["Hero","ProjectGrid","Testimonials","ContactForm"]},{id:"landing-startup",name:"Landing Startup",category:"landing",description:"P\xe1gina de aterrizaje para startup early-stage con waitlist.",tags:["startup","waitlist","mvp"],defaultPages:["home"],suggestedComponents:["Hero","ProblemSolution","WaitlistForm","SocialProof"]},{id:"blog-magazine",name:"Blog / Revista",category:"blog",description:"Sitio editorial con listado de art\xedculos y categor\xedas.",tags:["blog","contenido","seo"],defaultPages:["home","blog","article","about"],suggestedComponents:["ArticleList","ArticleHero","Newsletter","Sidebar"]},{id:"ecommerce-lite",name:"E-commerce Lite",category:"ecommerce",description:"Cat\xe1logo simple con productos destacados y checkout stub.",tags:["ecommerce","retail","catalogo"],defaultPages:["home","shop","product","cart"],suggestedComponents:["ProductGrid","ProductCard","CartDrawer","CheckoutStub"]},{id:"docs-product",name:"Documentaci\xf3n",category:"docs",description:"Hub de documentaci\xf3n con navegaci\xf3n lateral y b\xfasqueda.",tags:["docs","api","developer"],defaultPages:["home","docs","api-reference"],suggestedComponents:["DocsSidebar","DocsContent","CodeBlock","SearchBar"]}];function e(a){return d.find(b=>b.id===a)}}};