"use strict";exports.id=5522,exports.ids=[5522],exports.modules={2252:(a,b,c)=>{c.d(b,{Fo:()=>d.Fo,sK:()=>d.sK}),c(49250),c(9790);var d=c(82973)},16878:(a,b,c)=>{c.d(b,{c:()=>O});var d=c(21124),e=c(38301),f=c(92377),g=c(3991),h=c.n(g),i=c(603),j=c(86474),k=c(11426),l=c(2460),m=c(83851),n=c(70151);function o({status:a}){return"complete"===a?(0,d.jsx)("svg",{width:"12",height:"12",viewBox:"0 0 12 12",fill:"none","aria-hidden":!0,children:(0,d.jsx)("path",{d:"M2 6l3 3 5-5",stroke:"currentColor",strokeWidth:"1.5",strokeLinecap:"round",strokeLinejoin:"round"})}):"blocked"===a?(0,d.jsx)("span",{className:"fhis-venture-pipeline-blocked-mark",children:"!"}):(0,d.jsx)("span",{className:"fhis-venture-pipeline-dot"})}function p({steps:a}){return(0,d.jsx)("div",{className:"fhis-venture-pipeline fhis-vws-lifecycle",role:"list","aria-label":"Pipeline del ciclo de vida del fundador",children:a.map(a=>{var b;let c="complete"===(b=a.status)?"Completado":"active"===b?"En curso":"blocked"===b?"Bloqueado":"Pendiente";return(0,d.jsxs)("div",{className:"fhis-venture-pipeline-item",role:"listitem",children:[(0,d.jsx)("div",{className:"fhis-venture-pipeline-track",children:(0,d.jsx)("span",{className:(0,m.cn)("fhis-venture-pipeline-circle",`fhis-venture-pipeline-${a.status}`),title:`${a.label}: ${c}`,children:(0,d.jsx)(o,{status:a.status})})}),(0,d.jsx)("span",{className:(0,m.cn)("fhis-venture-pipeline-label",`fhis-venture-pipeline-label-${a.status}`),children:a.label}),(0,d.jsx)("span",{className:(0,m.cn)("fhis-venture-pipeline-status",`fhis-venture-pipeline-status-${a.status}`),children:c})]},a.id)})})}function q({data:a,activeSection:b,onSectionChange:c,children:e}){let g=f.Hg.reduce((a,b)=>(a[b.group]||(a[b.group]=[]),a[b.group].push(b),a),{});return(0,d.jsxs)("div",{className:"venture-workspace fhis-vws",children:[(0,d.jsxs)("header",{className:"fhis-venture-topbar",children:[(0,d.jsxs)(h(),{href:"/dashboard",className:"fhis-sidebar-logo",children:["Forge",(0,d.jsx)("span",{children:"OS"})]}),(0,d.jsxs)("div",{className:"venture-topbar-center",children:[(0,d.jsx)("h1",{style:{margin:0,fontSize:"var(--fhis-text-lg)"},children:a.venture.name}),(0,d.jsx)(k.n,{status:"active",label:a.currentState})]}),(0,d.jsxs)("div",{className:"venture-topbar-actions",style:{display:"flex",gap:"var(--fhis-space-2)",alignItems:"center",flexWrap:"wrap"},children:[(0,d.jsx)(n.j,{venture:a.venture}),(0,d.jsx)(h(),{href:`/venture/${a.venture.id}/timeline`,className:(0,m.cn)("fhis-btn","fhis-btn-ghost","fhis-btn-sm"),children:"Timeline"}),(0,d.jsx)(h(),{href:`/venture/${a.venture.id}/knowledge`,className:(0,m.cn)("fhis-btn","fhis-btn-ghost","fhis-btn-sm"),children:"Knowledge"}),(0,d.jsx)(h(),{href:"/founder",className:(0,m.cn)("fhis-btn","fhis-btn-ghost","fhis-btn-sm"),children:"Founder"}),(0,d.jsx)(h(),{href:"/ceo",className:(0,m.cn)("fhis-btn","fhis-btn-ghost","fhis-btn-sm"),children:"CEO"}),(0,d.jsx)(h(),{href:"/creator",className:(0,m.cn)("fhis-btn","fhis-btn-ghost","fhis-btn-sm"),children:"Creator"}),(0,d.jsx)(h(),{href:"/",className:(0,m.cn)("fhis-btn","fhis-btn-ghost","fhis-btn-sm"),children:"Nueva idea"}),(0,d.jsx)(h(),{href:"/projects",className:(0,m.cn)("fhis-btn","fhis-btn-secondary","fhis-btn-sm"),children:"Empresas"})]})]}),(0,d.jsxs)(j.Zk,{className:"fhis-vws-lifecycle-panel",children:[(0,d.jsx)(l.X,{title:"Ciclo de vida del fundador",subtitle:"Idea → Validaci\xf3n → Mercado → Producto → Construcci\xf3n → Lanzamiento → Crecimiento"}),(0,d.jsx)(p,{steps:a.founderLifecycle}),(0,d.jsxs)("div",{className:"fhis-vws-lifecycle-meta",children:[(0,d.jsx)(i.E,{variant:"blue",children:a.lifeStageLabel}),(0,d.jsx)(i.E,{variant:"accent",children:a.statusBadgeLabel}),(0,d.jsxs)("span",{style:{color:"var(--fhis-color-text-muted)",fontSize:"var(--fhis-text-sm)"},children:["Etapa activa: ",(0,d.jsx)("strong",{children:a.founderLifecycle.find(a=>"active"===a.status)?.label??a.lifeStageLabel})]})]})]}),(0,d.jsxs)("div",{className:"venture-body fhis-vws-body",children:[(0,d.jsx)("nav",{className:"venture-sidebar fhis-vws-nav",children:Object.entries(g).map(([a,e])=>(0,d.jsxs)("div",{className:"venture-nav-group",children:[(0,d.jsx)("span",{className:"venture-nav-group-label",children:a}),e.map(a=>(0,d.jsx)("button",{type:"button",className:(0,m.cn)("fhis-venture-nav-item",b===a.id&&"fhis-venture-nav-item-active"),onClick:()=>c(a.id),children:a.title},a.id))]},a))}),(0,d.jsx)("div",{className:"fhis-vws-content",children:e})]})]})}var r=c(58718);function s({data:a}){let{venture:b}=a;return(0,d.jsxs)(j.Zk,{id:"resumen",className:"fhis-vws-section",children:[(0,d.jsx)(l.X,{title:"Resumen Ejecutivo",subtitle:(0,r.pG)(b.category)}),(0,d.jsx)("p",{className:"fhis-vws-prose",children:a.executiveSummary}),(0,d.jsxs)("div",{className:"fhis-vws-tags",children:[(0,d.jsx)(i.E,{variant:"default",children:b.targetAudience}),b.analysis?.tags?.slice(0,4).map(a=>(0,d.jsx)(i.E,{variant:"blue",children:a.label},a.id))]})]})}var t=c(38126),u=c(27791);function v({data:a}){let{ceoBrief:b}=a;return(0,d.jsxs)(j.Zk,{id:"ceo",className:"fhis-vws-section fhis-vws-ceo",children:[(0,d.jsx)(l.X,{title:"Director General",subtitle:"Observaci\xf3n ejecutiva — sin chatbot"}),(0,d.jsxs)(t.L,{name:"Director General",role:"ForgeOS Executive Office",children:[(0,d.jsx)(u.S,{title:"Observaci\xf3n",subtitle:"Estado actual del venture",children:(0,d.jsx)("p",{className:"fhis-vws-prose",children:b.observation})}),(0,d.jsx)(u.S,{title:"Recomendaci\xf3n",subtitle:"Acci\xf3n prioritaria",children:(0,d.jsx)("p",{className:"fhis-vws-prose",children:b.recommendation})}),(0,d.jsxs)("div",{className:"fhis-vws-ceo-insights",children:[(0,d.jsxs)("div",{className:"fhis-vws-ceo-insight",children:[(0,d.jsx)(i.E,{variant:"amber",children:"Riesgo"}),(0,d.jsx)("p",{className:"fhis-vws-prose",children:b.criticalRisk})]}),(0,d.jsxs)("div",{className:"fhis-vws-ceo-insight",children:[(0,d.jsx)(i.E,{variant:"accent",children:"Oportunidad"}),(0,d.jsx)("p",{className:"fhis-vws-prose",children:b.opportunity})]})]})]})]})}var w=c(92805);function x({data:a}){return(0,d.jsxs)(j.Zk,{id:"estado",className:"fhis-vws-section",children:[(0,d.jsx)(l.X,{title:"Estado del Venture",subtitle:"Vista operativa del ciclo de vida"}),(0,d.jsxs)("div",{className:"fhis-vws-status-row",children:[(0,d.jsx)(k.n,{status:"active",label:a.currentState}),(0,d.jsxs)("span",{style:{color:"var(--fhis-color-text-muted)"},children:["Confianza: ",(0,d.jsx)("strong",{children:a.confidenceLabel})]})]}),(0,d.jsx)(p,{steps:a.founderLifecycle}),(0,d.jsxs)(j.xA,{cols:3,gap:"md",children:[(0,d.jsx)(w.c,{label:"Etapa de vida",value:a.lifeStageLabel}),(0,d.jsx)(w.c,{label:"Estado",value:a.statusBadgeLabel}),(0,d.jsx)(w.c,{label:"\xdaltima actualizaci\xf3n",value:new Date(a.venture.updatedAt).toLocaleDateString("es-ES")})]})]})}var y=c(62161);function z({data:a}){let{startupScore:b,ventureScore:c}=a;return(0,d.jsxs)(j.Zk,{id:"startup-score",className:"fhis-vws-section",children:[(0,d.jsx)(l.X,{title:"Startup Score",subtitle:"Potencial y viabilidad del venture"}),(0,d.jsxs)(j.xA,{cols:2,gap:"lg",children:[(0,d.jsxs)("div",{children:[(0,d.jsx)(w.c,{label:"Startup Score",value:b.display,className:(0,m.cn)(b.pending&&"fhis-vpc-score-pending")}),(0,d.jsx)("span",{className:"fhis-vpc-score-label",children:b.label}),!b.pending&&null!==b.value&&(0,d.jsx)(y.k,{value:b.value,label:"Potencial",showValue:!0})]}),(0,d.jsxs)("div",{children:[(0,d.jsx)(w.c,{label:"Venture Score",value:c.display,className:(0,m.cn)(c.pending&&"fhis-vpc-score-pending")}),(0,d.jsx)("span",{className:"fhis-vpc-score-label",children:c.label}),!c.pending&&null!==c.value&&(0,d.jsx)(y.k,{value:c.value,label:"Simulaci\xf3n",showValue:!0})]})]})]})}let A={ready:"accent",progress:"blue",pending:"default"};function B({data:a}){let{investmentReadiness:b}=a;return(0,d.jsxs)(j.Zk,{id:"investment-readiness",className:"fhis-vws-section",children:[(0,d.jsx)(l.X,{title:"Investment Readiness",subtitle:b.overallLabel}),(0,d.jsx)(y.k,{value:b.overallScore,label:"Preparaci\xf3n global",showValue:!0}),(0,d.jsx)(j.BJ,{gap:"md",children:b.metrics.map(a=>(0,d.jsxs)("div",{className:"fhis-vws-readiness-row",children:[(0,d.jsxs)("div",{className:"fhis-vws-readiness-head",children:[(0,d.jsx)("span",{children:a.label}),(0,d.jsxs)(i.E,{variant:A[a.status],children:[a.score,"/",a.maxScore]})]}),(0,d.jsx)(y.k,{value:a.score,max:a.maxScore}),(0,d.jsx)("span",{style:{fontSize:"var(--fhis-text-sm)",color:"var(--fhis-color-text-muted)"},children:a.detail})]},a.id))})]})}var C=c(57698);let D={alta:"amber",media:"blue",baja:"default"};function E({data:a}){let b=(0,f.qC)(a.venture);return(0,d.jsxs)(j.Zk,{id:"next-actions",className:"fhis-vws-section",children:[(0,d.jsx)(l.X,{title:"Pr\xf3ximas acciones",subtitle:"Recomendaciones basadas en el estado del venture"}),(0,d.jsx)(j.BJ,{gap:"md",children:b.map((a,b)=>(0,d.jsxs)(C.Z,{variant:"ghost",padding:"md",children:[(0,d.jsxs)("div",{className:"fhis-vws-action-head",children:[(0,d.jsx)(i.E,{variant:D[a.priority],children:a.priority}),(0,d.jsx)("strong",{children:a.label})]}),(0,d.jsx)("p",{className:"fhis-vws-prose",children:a.description}),(0,d.jsxs)("p",{style:{fontSize:"var(--fhis-text-sm)",color:"var(--fhis-color-text-muted)"},children:["Impacto: ",a.impact]}),(0,d.jsx)(h(),{href:a.href,className:(0,m.cn)("fhis-btn","fhis-btn-primary","fhis-btn-sm"),children:"Continuar"})]},`${a.label}-${b}`))})]})}var F=c(43497);function G({data:a}){return(0,d.jsxs)(j.Zk,{id:"timeline",className:"fhis-vws-section",children:[(0,d.jsx)(l.X,{title:"Timeline",subtitle:"Actividad del venture"}),(0,d.jsx)(F.K,{items:a.timeline.map(a=>({title:a.title,time:a.relative,description:a.description}))})]})}var H=c(43998);function I({data:a}){let{research:b}=a;return(0,d.jsxs)(j.Zk,{id:"research",className:"fhis-vws-section",children:[(0,d.jsx)(l.X,{title:"Research",subtitle:"Inteligencia de mercado y competencia"}),b.hasContent?(0,d.jsxs)(d.Fragment,{children:[b.source&&(0,d.jsx)(i.E,{variant:"accent",children:b.source}),(0,d.jsx)("p",{className:"fhis-vws-prose",children:b.excerpt})]}):(0,d.jsx)(H.p,{icon:"◎",title:"Research pendiente",description:b.excerpt})]})}function J({data:a}){let{product:b}=a;return(0,d.jsxs)(j.Zk,{id:"product",className:"fhis-vws-section",children:[(0,d.jsx)(l.X,{title:"Product",subtitle:"PRD y definici\xf3n de MVP"}),b.hasContent?(0,d.jsxs)(d.Fragment,{children:[b.source&&(0,d.jsx)(i.E,{variant:"accent",children:b.source}),(0,d.jsx)("p",{className:"fhis-vws-prose",children:b.excerpt})]}):(0,d.jsx)(H.p,{icon:"◫",title:"Product pendiente",description:b.excerpt})]})}function K({data:a}){let{architecture:b}=a;return(0,d.jsxs)(j.Zk,{id:"architecture",className:"fhis-vws-section",children:[(0,d.jsx)(l.X,{title:"Architecture",subtitle:"Dise\xf1o t\xe9cnico de alto nivel"}),b.hasContent?(0,d.jsx)("pre",{className:"fhis-vws-code",children:(0,d.jsx)("code",{children:b.excerpt})}):(0,d.jsx)(H.p,{icon:"⬡",title:"Arquitectura pendiente",description:b.excerpt})]})}function L({data:a}){let b=a?.buildStatus,c=b?.items??[];return b?(0,d.jsxs)(j.Zk,{id:"build",className:"fhis-vws-section",children:[(0,d.jsx)(l.X,{title:"Build",subtitle:"Estado de construcci\xf3n — sin detalles de runtime"}),(0,d.jsxs)("div",{className:"fhis-vws-status-row",children:[(0,d.jsx)(k.n,{status:"active",label:b.phase}),(0,d.jsxs)(i.E,{variant:"blue",children:[b.progress,"% completado"]})]}),(0,d.jsx)(y.k,{value:b.progress,label:"Progreso del paquete t\xe9cnico",showValue:!0}),(0,d.jsx)(j.BJ,{gap:"sm",children:c.map(a=>(0,d.jsxs)("div",{className:"fhis-vws-build-row",children:[(0,d.jsx)("span",{children:a.label}),(0,d.jsx)(i.E,{variant:a.done?"accent":"default",children:a.done?"Listo":"Pendiente"})]},a.label))})]}):(0,d.jsxs)(j.Zk,{id:"build",className:"fhis-vws-section",children:[(0,d.jsx)(l.X,{title:"Build",subtitle:"Estado de construcci\xf3n — sin detalles de runtime"}),(0,d.jsx)("p",{children:"Sin datos de build disponibles."})]})}function M({data:a}){let{knowledge:b}=a;return(0,d.jsxs)(j.Zk,{id:"knowledge",className:"fhis-vws-section",children:[(0,d.jsx)(l.X,{title:"Knowledge",subtitle:"Referencias y contexto de dominio"}),b.hasContent?(0,d.jsxs)(d.Fragment,{children:[b.source&&(0,d.jsx)(i.E,{variant:"blue",children:b.source}),(0,d.jsx)("p",{className:"fhis-vws-prose",children:b.excerpt})]}):(0,d.jsx)(H.p,{icon:"◇",title:"Sin knowledge vinculado",description:b.excerpt})]})}function N({data:a}){return(0,d.jsxs)(j.Zk,{id:"metrics",className:"fhis-vws-section",children:[(0,d.jsx)(l.X,{title:"Metrics",subtitle:"Indicadores clave del venture"}),(0,d.jsx)(j.xA,{cols:2,gap:"md",children:a.metrics.map(a=>(0,d.jsxs)("div",{children:[(0,d.jsx)(w.c,{label:a.label,value:a.value}),(0,d.jsx)("span",{className:"fhis-vpc-score-label",children:a.detail})]},a.label))})]})}function O({venture:a,initialSection:b="resumen"}){let[c,g]=(0,e.useState)(b),h=(0,f.Xu)(a);return(0,d.jsx)(q,{data:h,activeSection:c,onSectionChange:a=>g(a),children:function(a,b){switch(a){case"resumen":default:return(0,d.jsx)(s,{data:b});case"ceo":return(0,d.jsx)(v,{data:b});case"estado":return(0,d.jsx)(x,{data:b});case"startup-score":return(0,d.jsx)(z,{data:b});case"investment-readiness":return(0,d.jsx)(B,{data:b});case"next-actions":return(0,d.jsx)(E,{data:b});case"timeline":return(0,d.jsx)(G,{data:b});case"research":return(0,d.jsx)(I,{data:b});case"product":return(0,d.jsx)(J,{data:b});case"architecture":return(0,d.jsx)(K,{data:b});case"build":return(0,d.jsx)(L,{data:b});case"knowledge":return(0,d.jsx)(M,{data:b});case"metrics":return(0,d.jsx)(N,{data:b})}}(c,h)})}},24742:(a,b,c)=>{c.d(b,{p:()=>f});var d=c(21124),e=c(83851);function f({label:a,hint:b,error:c,className:f,id:g,...h}){let i=g??a?.toLowerCase().replace(/\s+/g,"-");return(0,d.jsxs)("div",{className:(0,e.cn)("fhis-input-wrap",f),children:[a&&(0,d.jsx)("label",{className:"fhis-input-label",htmlFor:i,children:a}),(0,d.jsx)("input",{id:i,className:(0,e.cn)("fhis-input",c&&"fhis-input-error-state"),...h}),c&&(0,d.jsx)("span",{className:"fhis-input-error",children:c}),b&&!c&&(0,d.jsx)("span",{className:"fhis-input-hint",children:b})]})}},27791:(a,b,c)=>{c.d(b,{S:()=>f});var d=c(21124),e=c(83851);function f({title:a,subtitle:b,children:c,className:f}){return(0,d.jsxs)("div",{className:(0,e.cn)("fhis-ceo-card",f),children:[(0,d.jsx)("div",{className:"fhis-ceo-card-title",children:a}),b&&(0,d.jsx)("div",{className:"fhis-ceo-card-subtitle",children:b}),(0,d.jsx)("div",{className:"fhis-ceo-card-content",children:c})]})}},34673:(a,b,c)=>{c.d(b,{F:()=>S});var d=c(21124),e=c(38301),f=c(3991),g=c.n(f),h=c(43249),i=c(54287),j=c(50190),k=c(603),l=c(70284),m=c(86474),n=c(2460),o=c(47322),p=c(43998);let q={alta:"Alta",media:"Media",baja:"Baja"},r={conservador:"Conservador",base:"Base",optimista:"Optimista"};function s(a){return a>=1e6?`€${(a/1e6).toFixed(1)}M`:a>=1e3?`€${Math.round(a/1e3)}K`:`€${a}`}function t({venture:a,input:b}){let c=a?.id,[f,g]=(0,e.useState)({}),[h,t]=(0,e.useState)(!1),[u,v]=(0,e.useState)(!1),w=(0,e.useMemo)(()=>b??(a?(0,i.tf)(a):null),[a,b]),x=(0,e.useMemo)(()=>{if(!w)return null;let b=(0,i.I_)(f)?f:void 0;return a?.ventureSimulatorResult&&!h&&(!(0,i.I_)(f)||(0,i.vk)(f,a.ventureSimulatorOverrides))?a.ventureSimulatorResult:(0,i.zL)(w,b)},[w,f,h,a?.ventureSimulatorResult]);if(!x)return(0,d.jsx)(p.p,{icon:"◎",title:"Simulaci\xf3n pendiente",description:"Escribe una idea m\xe1s detallada para simular el venture."});let y={monthlyPrice:x.assumptions.revenuePerUserYear1/12,estimatedCAC:x.assumptions.baseCAC,monthlyChurnPercent:x.assumptions.baseChurnMonthly,monthlyBurn:x.assumptions.monthlyBurnEstimate,estimatedConversion:x.assumptions.baseConversion},z=a?.ventureSimulatorResult&&!h&&!(0,i.I_)(f);return(0,d.jsxs)("div",{className:"venture-simulator",children:[(0,d.jsxs)("header",{className:"sim-header",children:[(0,d.jsx)(n.X,{title:"Venture Simulator",description:"Simulaci\xf3n estrat\xe9gica y econ\xf3mica heur\xedstica — no sustituye validaci\xf3n con usuarios reales."}),z&&(0,d.jsx)("p",{className:"sim-persisted-note",children:"Resultado guardado al aceptar el build pre-construcci\xf3n."}),(0,d.jsxs)("div",{className:"sim-sources",style:{display:"flex",flexWrap:"wrap",gap:"var(--fhis-space-2)"},children:[x.customAssumptions&&(0,d.jsx)(k.E,{variant:"blue",children:"Custom assumptions"}),x.dataSourcesUsed.map(a=>(0,d.jsx)(k.E,{variant:"default",children:a},a))]})]}),(0,d.jsxs)("div",{className:"fhis-sim-score-row",children:[(0,d.jsx)(o.V,{title:"Startup Score",value:x.startupScore}),(0,d.jsx)(o.V,{title:"Venture Score",value:x.ventureScore}),(0,d.jsxs)(m.Zk,{children:[(0,d.jsx)("span",{style:{fontSize:"var(--fhis-text-xs)",color:"var(--fhis-color-text-muted)",textTransform:"uppercase"},children:"Recomendaci\xf3n"}),(0,d.jsx)("strong",{style:{display:"block",fontSize:"var(--fhis-text-lg)"},children:x.recommendationLabel}),(0,d.jsxs)("span",{style:{fontSize:"var(--fhis-text-sm)",color:"var(--fhis-color-text-muted)"},children:["Confianza: ",q[x.confidence]]})]})]}),(0,d.jsx)(l.$,{type:"button",variant:"ghost",size:"sm",onClick:()=>v(a=>!a),children:u?"Ocultar supuestos":"Ajustar supuestos econ\xf3micos"}),u&&(0,d.jsx)(j.O,{overrides:f,defaults:y,onChange:function(a){g(a),t(!0),c&&(0,i.B5)(c,a)}}),(0,d.jsxs)(m.Zk,{children:[(0,d.jsx)(n.X,{title:"Escenarios (a\xf1o 1 y 2)"}),(0,d.jsx)("div",{className:"sim-scenarios-grid",children:x.scenarios.map(a=>(0,d.jsxs)(m.Zk,{style:{padding:"var(--fhis-space-3)"},children:[(0,d.jsx)("h4",{children:r[a.scenario]}),(0,d.jsxs)("dl",{className:"sim-scenario-dl",children:[(0,d.jsxs)("div",{children:[(0,d.jsx)("dt",{children:"Usuarios A1"}),(0,d.jsx)("dd",{children:a.year1Users.toLocaleString("es-ES")})]}),(0,d.jsxs)("div",{children:[(0,d.jsx)("dt",{children:"Usuarios A2"}),(0,d.jsx)("dd",{children:a.year2Users.toLocaleString("es-ES")})]}),(0,d.jsxs)("div",{children:[(0,d.jsx)("dt",{children:"Ingresos A1"}),(0,d.jsx)("dd",{children:s(a.year1Revenue)})]}),(0,d.jsxs)("div",{children:[(0,d.jsx)("dt",{children:"Ingresos A2"}),(0,d.jsx)("dd",{children:s(a.year2Revenue)})]}),(0,d.jsxs)("div",{children:[(0,d.jsx)("dt",{children:"CAC"}),(0,d.jsx)("dd",{children:s(a.estimatedCAC)})]}),(0,d.jsxs)("div",{children:[(0,d.jsx)("dt",{children:"LTV"}),(0,d.jsx)("dd",{children:s(a.estimatedLTV)})]}),(0,d.jsxs)("div",{children:[(0,d.jsx)("dt",{children:"Conversi\xf3n"}),(0,d.jsxs)("dd",{children:[a.estimatedConversion,"%"]})]}),(0,d.jsxs)("div",{children:[(0,d.jsx)("dt",{children:"Churn/mes"}),(0,d.jsxs)("dd",{children:[a.estimatedChurn,"%"]})]}),(0,d.jsxs)("div",{children:[(0,d.jsx)("dt",{children:"Break-even"}),(0,d.jsx)("dd",{children:a.breakEvenMonths?`${a.breakEvenMonths} meses`:"No alcanzado"})]}),(0,d.jsxs)("div",{children:[(0,d.jsx)("dt",{children:"Adquisici\xf3n"}),(0,d.jsx)("dd",{children:a.acquisitionComplexity})]})]}),(0,d.jsxs)("p",{className:"sim-scenario-risk",children:[(0,d.jsx)("strong",{children:"Riesgo principal:"})," ",a.primaryRisk]})]},a.scenario))})]}),(0,d.jsxs)("div",{className:"fhis-sim-insights-grid",children:[(0,d.jsxs)(m.Zk,{children:[(0,d.jsx)(n.X,{title:"Riesgos"}),(0,d.jsx)("ul",{className:"sim-list",children:x.risks.map(a=>(0,d.jsx)("li",{children:a},a))})]}),(0,d.jsxs)(m.Zk,{children:[(0,d.jsx)(n.X,{title:"Oportunidades"}),(0,d.jsx)("ul",{className:"sim-list",children:x.opportunities.map(a=>(0,d.jsx)("li",{children:a},a))})]}),(0,d.jsxs)(m.Zk,{children:[(0,d.jsx)(n.X,{title:"Alternativas recomendadas"}),(0,d.jsx)("ul",{className:"sim-list",children:x.recommendedAlternatives.map(a=>(0,d.jsx)("li",{children:a},a))})]})]}),(0,d.jsxs)(m.Zk,{children:[(0,d.jsx)(n.X,{title:"Siguiente acci\xf3n sugerida"}),(0,d.jsx)("p",{children:x.suggestedNextAction}),(0,d.jsxs)("p",{className:"sim-assumptions-note",children:["Modelo: ",x.assumptions.businessModel," \xb7 Base usuarios A1: ",x.assumptions.baseYear1Users.toLocaleString("es-ES")]})]})]})}var u=c(2252);function v({text:a,label:b}){let[c,f]=(0,e.useState)(!1);async function g(){try{await navigator.clipboard.writeText(a),f(!0),setTimeout(()=>f(!1),2e3)}catch{f(!1)}}return(0,d.jsx)(l.$,{type:"button",variant:"secondary",size:"sm",onClick:g,children:c?"Copiado ✓":b})}function w({venture:a}){let b=(0,e.useMemo)(()=>(0,u.Fo)(a),[a]);return(0,d.jsxs)("div",{className:"build-plan-panel",children:[(0,d.jsx)(n.X,{title:"Build Plan",description:"Paquete t\xe9cnico listo para Cursor o Claude — handoff de implementaci\xf3n MVP."}),(0,d.jsxs)(m.Zk,{children:[(0,d.jsx)(n.X,{title:"Resumen t\xe9cnico"}),(0,d.jsx)("p",{children:b.technicalSummary})]}),(0,d.jsxs)(m.Zk,{children:[(0,d.jsx)(n.X,{title:"Stack recomendado"}),(0,d.jsx)("ul",{className:"build-plan-stack-list",children:b.recommendedStack.map(a=>(0,d.jsxs)("li",{children:[(0,d.jsx)("strong",{children:a.layer})," — ",a.technology,(0,d.jsx)("span",{children:a.rationale})]},a.layer))})]}),(0,d.jsxs)(m.xA,{cols:2,gap:"md",children:[(0,d.jsxs)(m.Zk,{children:[(0,d.jsx)(n.X,{title:"M\xf3dulos"}),(0,d.jsx)("ul",{className:"build-plan-tags",children:b.technicalModules.map(a=>(0,d.jsx)("li",{children:(0,d.jsx)(k.E,{variant:"default",children:a})},a))})]}),(0,d.jsxs)(m.Zk,{children:[(0,d.jsx)(n.X,{title:"Entidades"}),(0,d.jsx)("ul",{className:"build-plan-tags",children:b.mainEntities.map(a=>(0,d.jsx)("li",{children:(0,d.jsx)(k.E,{variant:"blue",children:a})},a))})]})]}),(0,d.jsxs)(m.Zk,{children:[(0,d.jsx)(n.X,{title:"APIs"}),(0,d.jsxs)("table",{className:"build-plan-table",children:[(0,d.jsx)("thead",{children:(0,d.jsxs)("tr",{children:[(0,d.jsx)("th",{children:"M\xe9todo"}),(0,d.jsx)("th",{children:"Ruta"}),(0,d.jsx)("th",{children:"Descripci\xf3n"})]})}),(0,d.jsx)("tbody",{children:b.apis.map(a=>(0,d.jsxs)("tr",{children:[(0,d.jsx)("td",{children:(0,d.jsx)("code",{children:a.method})}),(0,d.jsx)("td",{children:(0,d.jsx)("code",{children:a.path})}),(0,d.jsx)("td",{children:a.description})]},`${a.method}-${a.path}`))})]})]}),(0,d.jsxs)(m.xA,{cols:2,gap:"md",children:[(0,d.jsxs)(m.Zk,{children:[(0,d.jsx)(n.X,{title:"Pantallas"}),(0,d.jsx)("ul",{className:"build-plan-list",children:b.screens.map(a=>(0,d.jsx)("li",{children:a},a))})]}),(0,d.jsxs)(m.Zk,{children:[(0,d.jsx)(n.X,{title:"Componentes frontend"}),(0,d.jsx)("ul",{className:"build-plan-list",children:b.frontendComponents.map(a=>(0,d.jsx)("li",{children:a},a))})]})]}),(0,d.jsxs)(m.Zk,{children:[(0,d.jsx)(n.X,{title:"Orden de implementaci\xf3n"}),(0,d.jsx)("ol",{className:"build-plan-ordered",children:b.implementationOrder.map(a=>(0,d.jsx)("li",{children:a},a))})]}),(0,d.jsxs)(m.Zk,{children:[(0,d.jsx)(n.X,{title:"Checklist MVP"}),(0,d.jsx)("ul",{className:"build-plan-checklist",children:b.mvpChecklist.map(a=>(0,d.jsxs)("li",{className:(0,h.A)(`check-priority-${a.priority}`),children:[(0,d.jsx)(k.E,{variant:"alta"===a.priority?"red":"media"===a.priority?"amber":"default",children:a.priority}),(0,d.jsx)("span",{children:a.task}),(0,d.jsx)("em",{children:a.phase})]},a.id))})]}),(0,d.jsxs)(m.Zk,{children:[(0,d.jsx)(n.X,{title:"Riesgos t\xe9cnicos"}),(0,d.jsx)("ul",{className:"build-plan-list",children:b.technicalRisks.map(a=>(0,d.jsx)("li",{children:a},a))})]}),(0,d.jsxs)(m.Zk,{className:"build-plan-prompt",children:[(0,d.jsxs)("div",{className:"build-plan-prompt-header",children:[(0,d.jsx)(n.X,{title:"Prompt Cursor"}),(0,d.jsx)(v,{text:b.cursorPrompt,label:"Copiar prompt Cursor"})]}),(0,d.jsx)("pre",{className:"build-plan-prompt-body",children:b.cursorPrompt})]}),(0,d.jsxs)(m.Zk,{className:"build-plan-prompt",children:[(0,d.jsxs)("div",{className:"build-plan-prompt-header",children:[(0,d.jsx)(n.X,{title:"Prompt Claude"}),(0,d.jsx)(v,{text:b.claudePrompt,label:"Copiar prompt Claude"})]}),(0,d.jsx)("pre",{className:"build-plan-prompt-body",children:b.claudePrompt})]})]})}var x=c(99351),y=c(40146),z=c(38385),A=c(2088),B=c(23883);c(17604);let C={idea:"Idea",discovery:"Discovery",research:"Research",simulator:"Simulador",product:"Producto",build:"Build",launch:"Lanzamiento",growth:"Crecimiento"};function D(a,b,c,d){return{phase:a,label:C[a],date:b,impact:c,responsible:d}}var E=c(56491),F=c(30647),G=c(43422),H=c(4133);function I(a,b,c,d,e){return{id:crypto.randomUUID(),ventureId:a,title:b,description:c,priority:d,rationale:e,generatedAt:new Date().toISOString()}}c(78371),c(60391);var J=c(43497),K=c(11426),L=c(57698),M=c(92805),N=c(83851);let O=[{id:"timeline",label:"Timeline"},{id:"decisiones",label:"Decisiones"},{id:"aprendizajes",label:"Aprendizajes"},{id:"patrones",label:"Patrones"},{id:"insights",label:"Insights"}];function P({venture:a}){let[b,c]=(0,e.useState)("timeline"),[f,g]=(0,e.useState)(!1),h=(0,e.useMemo)(()=>{if(!f)return null;let b=(0,x.zM)(),c=(0,A.K)(b),d=(0,B.CM)(a.id),e=function(a,b){let c=[];c.push(D("idea",a.createdAt,"Inicio del venture","founder")),a.intelligenceAccepted&&c.push(D("idea",a.updatedAt,"Inteligencia aceptada","founder"));let d=a.discoveryContext?.answers.length??0;if(d>0&&c.push(D("discovery",a.updatedAt,`${d} decisiones aclaradas`,"founder")),a.researchReport&&c.push(D("research",a.updatedAt,"Research de mercado","founder")),a.ventureSimulatorResult){let b=a.ventureSimulatorResult;c.push(D("simulator",a.updatedAt,`Score ${b.startupScore}/100 — ${b.recommendationLabel}`,"founder"))}for(let d of(a.productPRD&&c.push(D("product",a.updatedAt,a.name,"founder")),a.sections.some(a=>["arquitectura","backend","frontend","build-plan"].includes(a.id)&&a.content.trim().length>0)&&c.push(D("build",a.updatedAt,"Plan de construcci\xf3n","founder")),"ready"===a.status&&c.push(D("launch",a.updatedAt,"Venture listo","founder")),b))"completed"!==d.status||c.some(a=>a.impact===d.title)||c.push({phase:"growth",label:d.title,date:d.date,impact:d.expectedImpact,responsible:d.takenBy});return c.sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime())}(a,d),g=(0,E.eF)(a.id),h=(0,F.Hu)(a.id),i=(0,H.G)(a.id,c);return{decisions:d,timeline:e,patterns:g,learning:h,insights:i,recommendations:function(a,b){let c=[],d=a.discoveryContext?.answers.length??0;if(d<3&&c.push(I(a.id,"Completar discovery","Responde las preguntas pendientes antes de avanzar","high","Discovery incompleto correlaciona con scores m\xe1s bajos en el portfolio")),!a.researchReport&&a.intelligenceAccepted&&c.push(I(a.id,"Generar research","Ejecuta research de mercado para validar supuestos","medium","Ventures con research tienen mejor contexto para PRD y simulador")),!a.ventureSimulatorResult&&d>0&&c.push(I(a.id,"Ejecutar simulador","Eval\xfaa viabilidad financiera con el Venture Simulator","high","El simulador integra discovery, research y producto")),a.ventureSimulatorResult){let b=a.ventureSimulatorResult;"research_more"===b.recommendation&&c.push(I(a.id,"Profundizar investigaci\xf3n",b.recommendedAlternatives[0]??"Ampliar an\xe1lisis de mercado","high",`Recomendaci\xf3n del simulador: ${b.recommendationLabel}`)),"build_small_mvp"===b.recommendation&&c.push(I(a.id,"Construir MVP acotado","Enf\xf3cate en el n\xfacleo de valor con scope m\xednimo","medium",`Score ${b.startupScore}/100 — viable con MVP reducido`))}for(let b of(0,E.eF)(a.id))"build_delay"===b.type&&c.push(I(a.id,"Avanzar a build","Han pasado semanas sin secciones de ingenier\xeda","high",b.description)),"incomplete_discovery"===b.type&&c.push(I(a.id,"Mejorar discovery","Completar aclaraciones antes de decisiones de producto","medium",b.description));let e=(0,F.Hu)(a.id);if(e)for(let b of e.recommendedActions.slice(0,2))c.some(a=>a.title===b)||c.push(I(a.id,b,b,"low","Derivado del motor de aprendizaje"));if(b){let d=b.patterns.find(a=>"saas_preference"===a.type);d&&d.ventureIds.length/Math.max(b.totalVentures,1)>.6&&!/saas/i.test(a.intelligenceReport?.recommendedBusinessModel??"")&&c.push(I(a.id,"Considerar modelo SaaS","El portfolio muestra fuerte preferencia por SaaS","low",d.description))}return c}(a,c),metrics:function(a){let b=function(a){let b=(0,B.FU)(),c=(0,E.Q8)(),d=(0,F.KS)(),e=(0,G.GJ)(y.d.portfolio,null),f=a.filter(a=>a.ventureSimulatorResult).length,g=a.filter(a=>(a.discoveryContext?.answers.length??0)>0).length,h=a.map(a=>a.ventureSimulatorResult?.startupScore).filter(a=>void 0!==a),i=h.length>0?Math.round(h.reduce((a,b)=>a+b,0)/h.length):null,j=(0,z.y7)(),k=j.length>0?j.sort((a,b)=>new Date(b.syncedAt).getTime()-new Date(a.syncedAt).getTime())[0].syncedAt:null;return{totalDecisions:b.length,completedDecisions:b.filter(a=>"completed"===a.status).length,totalPatterns:c.length,totalInsights:e?.insights.length??0,totalLessons:d.reduce((a,b)=>a+b.lessonsLearned.length,0),venturesWithSimulator:f,venturesWithDiscovery:g,averageSimulatorScore:i,lastSyncedAt:k}}(a);return{decisiones:b.totalDecisions,completadas:b.completedDecisions,patrones:b.totalPatterns,insights:b.totalInsights,lecciones:b.totalLessons,conSimulador:b.venturesWithSimulator,conDiscovery:b.venturesWithDiscovery,scorePromedio:b.averageSimulatorScore??"—"}}(b)}},[a,f]);if(!h)return(0,d.jsx)(p.p,{title:"Sincronizando memoria...",description:"Preparando capa de inteligencia"});let{decisions:i,timeline:j,patterns:l,learning:o,insights:q,recommendations:r,metrics:s}=h,t={pending:"Pendiente",active:"Activa",completed:"Completada",reverted:"Revertida"};return(0,d.jsxs)(m.BJ,{gap:"lg",children:[(0,d.jsx)(n.X,{title:"Memoria del Venture",description:"Capa de inteligencia — decisiones, patrones y aprendizajes acumulados"}),(0,d.jsxs)("div",{className:"fhis-grid fhis-grid-cols-4 fhis-grid-gap-md",children:[(0,d.jsx)(M.c,{label:"Decisiones",value:s.decisiones}),(0,d.jsx)(M.c,{label:"Patrones",value:s.patrones}),(0,d.jsx)(M.c,{label:"Insights",value:s.insights}),(0,d.jsx)(M.c,{label:"Score prom.",value:s.scorePromedio})]}),(0,d.jsx)("nav",{style:{display:"flex",gap:"var(--fhis-space-2)",flexWrap:"wrap"},children:O.map(a=>(0,d.jsx)("button",{type:"button",className:(0,N.cn)("fhis-btn","fhis-btn-sm",b===a.id?"fhis-btn-primary":"fhis-btn-ghost"),onClick:()=>c(a.id),children:a.label},a.id))}),"timeline"===b&&(0,d.jsx)(m.Zk,{children:j.length>0?(0,d.jsx)(J.K,{items:j.map(a=>({title:a.label,time:new Date(a.date).toLocaleDateString("es-ES"),description:`${a.impact} — ${a.responsible}`}))}):(0,d.jsx)(p.p,{title:"Sin eventos",description:"El timeline se construir\xe1 conforme avance el venture"})}),"decisiones"===b&&(0,d.jsx)(m.BJ,{gap:"md",children:i.length>0?i.map(a=>(0,d.jsx)(L.Z,{variant:"ghost",padding:"md",children:(0,d.jsxs)(m.BJ,{gap:"sm",children:[(0,d.jsxs)("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"},children:[(0,d.jsx)("strong",{children:a.title}),(0,d.jsx)(K.n,{status:"completed"===a.status?"success":"active"===a.status?"active":"pending",label:t[a.status]??a.status})]}),(0,d.jsx)("p",{style:{margin:0,color:"var(--fhis-color-text-muted)",fontSize:"var(--fhis-text-sm)"},children:a.description}),(0,d.jsxs)("div",{style:{display:"flex",gap:"var(--fhis-space-2)"},children:[(0,d.jsx)(k.E,{variant:"default",children:a.takenBy}),(0,d.jsx)(k.E,{variant:"accent",children:a.expectedImpact})]})]})},a.id)):(0,d.jsx)(p.p,{title:"Sin decisiones",description:"Las decisiones se registran autom\xe1ticamente en hitos clave"})}),"aprendizajes"===b&&(0,d.jsx)(m.BJ,{gap:"md",children:o?(0,d.jsxs)(d.Fragment,{children:[o.lessonsLearned.length>0&&(0,d.jsxs)(L.Z,{padding:"md",children:[(0,d.jsx)(n.X,{title:"Lecciones aprendidas"}),(0,d.jsx)("ul",{children:o.lessonsLearned.map((a,b)=>(0,d.jsx)("li",{children:a},b))})]}),o.bestPractices.length>0&&(0,d.jsxs)(L.Z,{padding:"md",children:[(0,d.jsx)(n.X,{title:"Mejores pr\xe1cticas"}),(0,d.jsx)("ul",{children:o.bestPractices.map((a,b)=>(0,d.jsx)("li",{children:a},b))})]}),o.repeatedMistakes.length>0&&(0,d.jsxs)(L.Z,{padding:"md",children:[(0,d.jsx)(n.X,{title:"Errores repetidos"}),(0,d.jsx)("ul",{children:o.repeatedMistakes.map((a,b)=>(0,d.jsx)("li",{children:a},b))})]}),r.length>0&&(0,d.jsxs)(L.Z,{padding:"md",children:[(0,d.jsx)(n.X,{title:"Acciones recomendadas"}),(0,d.jsx)("ul",{children:r.map(a=>(0,d.jsxs)("li",{children:[(0,d.jsx)("strong",{children:a.title})," — ",a.description]},a.id))})]})]}):(0,d.jsx)(p.p,{title:"Sin aprendizajes",description:"Los aprendizajes se generan al sincronizar el venture"})}),"patrones"===b&&(0,d.jsx)(m.BJ,{gap:"md",children:l.length>0?l.map(a=>(0,d.jsx)(L.Z,{padding:"md",children:(0,d.jsxs)(m.BJ,{gap:"sm",children:[(0,d.jsxs)("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"},children:[(0,d.jsx)("strong",{children:a.label}),(0,d.jsxs)(k.E,{variant:"accent",children:[Math.round(100*a.confidence),"%"]})]}),(0,d.jsx)("p",{style:{margin:0,color:"var(--fhis-color-text-muted)"},children:a.description})]})},a.id)):(0,d.jsx)(p.p,{title:"Sin patrones",description:"No se detectaron patrones para este venture"})}),"insights"===b&&(0,d.jsx)(m.BJ,{gap:"md",children:q.length>0?q.map(a=>(0,d.jsx)(L.Z,{padding:"md",children:(0,d.jsxs)(m.BJ,{gap:"sm",children:[(0,d.jsx)("p",{style:{margin:0},children:a.text}),(0,d.jsxs)("div",{style:{display:"flex",gap:"var(--fhis-space-2)"},children:[(0,d.jsx)(k.E,{variant:"default",children:a.category}),(0,d.jsxs)(k.E,{variant:"accent",children:[Math.round(100*a.confidence),"% confianza"]})]})]})},a.id)):(0,d.jsx)(p.p,{title:"Sin insights",description:"Los insights se generan a nivel portfolio con m\xe1s ventures"})})]})}var Q=c(70151);let R=[{id:"resumen",title:"Resumen Ejecutivo",group:"Overview"},{id:"memoria",title:"Memoria",group:"Overview"},{id:"decisiones",title:"Decisiones aclaradas",group:"Overview"},{id:"simulator",title:"Venture Simulator",group:"Overview"},{id:"build-plan",title:"Build Plan",group:"Engineering"},{id:"founder-advisor",title:"Founder Advisor",group:"Overview"},{id:"mercado",title:"Mercado",group:"Research"},{id:"competidores",title:"Competidores",group:"Research"},{id:"prd",title:"PRD",group:"Product"},{id:"mvp",title:"MVP",group:"Product"},{id:"wireframes",title:"Wireframes",group:"Product"},{id:"ux",title:"UX",group:"Product"},{id:"arquitectura",title:"Arquitectura",group:"Engineering"},{id:"base-datos",title:"Base de datos",group:"Engineering"},{id:"backend",title:"Backend",group:"Engineering"},{id:"frontend",title:"Frontend",group:"Engineering"},{id:"landing",title:"Landing",group:"Go-to-market"},{id:"pricing",title:"Pricing",group:"Go-to-market"},{id:"kpis",title:"KPIs",group:"Go-to-market"},{id:"roadmap",title:"Roadmap",group:"Go-to-market"},{id:"legal",title:"Legal",group:"Operations"},{id:"qa",title:"QA",group:"Operations"}];function S({venture:a}){let[b,c]=(0,e.useState)("resumen"),f=a.sections.find(a=>a.id===b)??a.sections[0],i="simulator"===b,j="build-plan"===b,l="memoria"===b,o=R.filter(b=>"decisiones"!==b.id||(a.discoveryContext?.answers.length??0)>0).reduce((a,b)=>{let c=b.group??"General";return a[c]||(a[c]=[]),a[c].push(b),a},{});return(0,d.jsxs)("div",{className:"venture-workspace",children:[(0,d.jsxs)("header",{className:"fhis-venture-topbar",children:[(0,d.jsxs)(g(),{href:"/",className:"fhis-sidebar-logo",children:["Forge",(0,d.jsx)("span",{children:"OS"})]}),(0,d.jsxs)("div",{className:"venture-topbar-center",children:[(0,d.jsx)("h1",{style:{margin:0,fontSize:"var(--fhis-text-lg)"},children:a.name}),(0,d.jsx)(K.n,{status:"active",label:"Startup Package"})]}),(0,d.jsxs)("div",{className:"venture-topbar-actions",style:{display:"flex",gap:"var(--fhis-space-2)",alignItems:"center"},children:[(0,d.jsx)(g(),{href:`/founder-journey?ventureId=${a.id}`,className:(0,N.cn)("fhis-btn","fhis-btn-ghost","fhis-btn-sm"),style:{opacity:.85},children:"Tu recorrido"}),(0,d.jsx)(Q.j,{venture:a}),(0,d.jsx)(g(),{href:"/",className:(0,N.cn)("fhis-btn","fhis-btn-ghost","fhis-btn-sm"),children:"Nueva idea"}),(0,d.jsx)(g(),{href:"/projects",className:(0,N.cn)("fhis-btn","fhis-btn-secondary","fhis-btn-sm"),children:"Empresas"})]})]}),(0,d.jsxs)("div",{className:"venture-body",children:[(0,d.jsx)("nav",{className:"venture-sidebar",children:Object.entries(o).map(([e,f])=>(0,d.jsxs)("div",{className:"venture-nav-group",children:[(0,d.jsx)("span",{className:"venture-nav-group-label",children:e}),f.map(e=>(0,d.jsxs)("button",{type:"button",className:(0,h.A)("fhis-venture-nav-item",b===e.id&&"fhis-venture-nav-item-active"),onClick:()=>c(e.id),children:[e.title,"prd"===e.id&&"ai"===a.productPRDSource&&(0,d.jsx)(k.E,{variant:"accent",children:"IA"})]},e.id))]},e))}),(0,d.jsx)(m.Zk,{className:(0,h.A)("venture-document",(i||j||l)&&"venture-document-simulator"),children:i?(0,d.jsx)(t,{venture:a}):j?(0,d.jsx)(w,{venture:a}):l?(0,d.jsx)(P,{venture:a}):f?(0,d.jsxs)(d.Fragment,{children:[(0,d.jsxs)("header",{className:"venture-doc-header",children:[(0,d.jsx)(n.X,{title:f.title}),"prd"===f.id&&"ai"===a.productPRDSource&&(0,d.jsx)(k.E,{variant:"accent",children:"Generado con IA"})]}),(0,d.jsx)("div",{className:(0,h.A)("venture-doc-content","code"===f.format&&"venture-doc-code"),children:(0,d.jsx)("pre",{children:(0,d.jsx)("code",{children:f.content})})})]}):(0,d.jsx)("p",{style:{color:"var(--fhis-color-text-muted)"},children:"Sin contenido."})})]})]})}},43998:(a,b,c)=>{c.d(b,{p:()=>f});var d=c(21124),e=c(83851);function f({icon:a="◎",title:b,description:c,children:f,className:g}){return(0,d.jsxs)("div",{className:(0,e.cn)("fhis-empty-state",g),children:[(0,d.jsx)("span",{className:"fhis-empty-state-icon",children:a}),(0,d.jsx)("div",{className:"fhis-empty-state-title",children:b}),c&&(0,d.jsx)("div",{className:"fhis-empty-state-desc",children:c}),f]})}},47322:(a,b,c)=>{c.d(b,{V:()=>f});var d=c(21124),e=c(83851);function f({title:a,value:b,delta:c,className:f}){return(0,d.jsxs)("div",{className:(0,e.cn)("fhis-simulator-card",f),children:[(0,d.jsxs)("div",{className:"fhis-simulator-card-header",children:[(0,d.jsx)("span",{className:"fhis-simulator-card-title",children:a}),void 0!==c&&(0,d.jsxs)("span",{className:(0,e.cn)("fhis-simulator-card-delta",c>=0?"fhis-simulator-card-delta-up":"fhis-simulator-card-delta-down"),children:[c>=0?"+":"",c,"%"]})]}),(0,d.jsx)("div",{className:"fhis-simulator-card-value",children:b})]})}},50190:(a,b,c)=>{c.d(b,{O:()=>i});var d=c(21124),e=c(24742),f=c(2460),g=c(86474);function h(a){return null==a||Number.isNaN(a)?"":String(a)}function i({overrides:a,defaults:b,onChange:c,compact:i=!1}){function j(b,d){c({...a,[b]:function(a){if(!a.trim())return;let b=Number(a);return Number.isFinite(b)?b:void 0}(d)})}return(0,d.jsxs)("div",{className:i?"sim-overrides sim-overrides-compact":"sim-overrides",children:[(0,d.jsx)(f.X,{title:"Supuestos editables (opcional)"}),(0,d.jsxs)(g.xA,{cols:i?2:3,gap:"sm",children:[(0,d.jsx)(e.p,{label:"Precio medio mensual (€)",type:"number",min:0,step:1,placeholder:b?.monthlyPrice!=null?String(Math.round(b.monthlyPrice/12)):"—",value:h(a.monthlyPrice),onChange:a=>j("monthlyPrice",a.target.value)}),(0,d.jsx)(e.p,{label:"CAC estimado (€)",type:"number",min:0,step:1,placeholder:b?.estimatedCAC!=null?String(b.estimatedCAC):"—",value:h(a.estimatedCAC),onChange:a=>j("estimatedCAC",a.target.value)}),(0,d.jsx)(e.p,{label:"Churn mensual (%)",type:"number",min:0,max:100,step:.1,placeholder:b?.monthlyChurnPercent!=null?String(b.monthlyChurnPercent):"—",value:h(a.monthlyChurnPercent),onChange:a=>j("monthlyChurnPercent",a.target.value)}),(0,d.jsx)(e.p,{label:"Burn mensual (€)",type:"number",min:0,step:100,placeholder:b?.monthlyBurn!=null?String(b.monthlyBurn):"3500",value:h(a.monthlyBurn),onChange:a=>j("monthlyBurn",a.target.value)}),(0,d.jsx)(e.p,{label:"Comisi\xf3n (%)",type:"number",min:0,max:50,step:.5,placeholder:b?.commissionPercent!=null?String(b.commissionPercent):"—",value:h(a.commissionPercent),onChange:a=>j("commissionPercent",a.target.value)}),(0,d.jsx)(e.p,{label:"Conversi\xf3n (%)",type:"number",min:0,max:100,step:.1,placeholder:b?.estimatedConversion!=null?String(b.estimatedConversion):"—",value:h(a.estimatedConversion),onChange:a=>j("estimatedConversion",a.target.value)})]})]})}},51658:(a,b,c)=>{function d(a){return a.map(a=>`- ${a}`).join("\n")}function e(a,b,c){return`# PRD — ${b}
> ${"ai"===c?"✦ Generado con IA":"Borrador simulado"}

## Resumen ejecutivo
${a.executiveSummary}

## Problema
${a.problemStatement}

## Cliente objetivo
${a.targetCustomer}

## Propuesta de valor
${a.valueProposition}

## Alcance MVP
${d(a.mvpScope)}

## Funcionalidades V2
${d(a.v2Features)}

## User stories
${d(a.userStories)}

## Pantallas principales
${d(a.mainScreens)}

## Flujos core
${d(a.coreFlows)}

## Hip\xf3tesis
${d(a.assumptions)}

## Roadmap 30 / 60 / 90 d\xedas

### 30 d\xedas
${d(a.roadmap30_60_90.day30)}

### 60 d\xedas
${d(a.roadmap30_60_90.day60)}

### 90 d\xedas
${d(a.roadmap30_60_90.day90)}

## Riesgos
${d(a.risks)}

## M\xe9tricas de \xe9xito
${d(a.successMetrics)}`}function f(a,b){return`# MVP — ${b}

## Scope (4-8 semanas)
${a.mvpScope.map((a,b)=>`${b+1}. ${a}`).join("\n")}

## Flujos core
${d(a.coreFlows)}

## Fuera de scope v1
${d(a.v2Features.slice(0,4))}

## Hip\xf3tesis a validar
${d(a.assumptions)}`}function g(a){return`# Roadmap

## 30 d\xedas
${d(a.roadmap30_60_90.day30)}

## 60 d\xedas
${d(a.roadmap30_60_90.day60)}

## 90 d\xedas
${d(a.roadmap30_60_90.day90)}

## M\xe9tricas de \xe9xito
${d(a.successMetrics)}`}c.d(b,{FR:()=>f,kv:()=>g,sF:()=>e})},57698:(a,b,c)=>{c.d(b,{Z:()=>f});var d=c(21124),e=c(83851);function f({variant:a="default",padding:b="md",className:c,children:f,...g}){return(0,d.jsx)("div",{className:(0,e.cn)("fhis-card","elevated"===a&&"fhis-card-elevated","ghost"===a&&"fhis-card-ghost",`fhis-card-pad-${b}`,c),...g,children:f})}},60391:(a,b,c)=>{c.d(b,{Nu:()=>f});var d=c(40146),e=c(43422);function f(a,b){let c={entryId:a.id,domain:a.domain,version:a.version,category:b?.category??a.domain,priority:b?.priority??"medium",origin:b?.origin??"catalog",validFrom:a.createdAt,validUntil:void 0,ventureIds:b?.ventureIds??[],tags:a.tags,notes:b?.notes,evolvedAt:new Date().toISOString()},f=(0,e.GJ)(d.d.knowledgeEvolution,{});return f[a.id]=c,(0,e.PX)(d.d.knowledgeEvolution,f),c}},70151:(a,b,c)=>{c.d(b,{j:()=>B});var d=c(21124),e=c(38301),f=c(3991),g=c.n(f),h=c(51658),i=c(81453),j=c(54287),k=c(75434);let l={conservador:"Conservador",base:"Base",optimista:"Optimista"};function m(a){let b=(0,k.e7)(`PRD — ${a.name}`,a);if(a.productPRD){let c=a.productPRDSource??"mock";return b+(0,h.sF)(a.productPRD,a.name,c)}let c=(0,k.Dg)(a,"prd");return c!==k.eG?b+c:b+k.eG}function n(a){let b=(0,k.e7)(`Research Report — ${a.name}`,a),c=a.researchMeta?.source??"mock";if(a.researchReport){let d=(0,i.Mb)(a.researchReport,c),e=(0,i.l4)(a.researchReport,c);return`${b}${d}

---

${e}`}let d=(0,k.Dg)(a,"mercado"),e=(0,k.Dg)(a,"competidores");return d===k.eG&&e===k.eG?b+k.eG:`${b}## Mercado

${d}

---

## Competidores

${e}`}function o(a){let b=(0,k.e7)(`Product Roadmap — ${a.name}`,a);if(a.productPRD)return b+(0,h.kv)(a.productPRD);let c=(0,k.Dg)(a,"roadmap");return c!==k.eG?b+c:b+k.eG}function p(a){let b=(0,k.e7)(`Venture Simulator Report — ${a.name}`,a),c=a.ventureSimulatorResult?a.ventureSimulatorResult:(0,j.zL)((0,j.tf)(a));if(!c)return`${b}${k.eG}`;let d=c.scenarios.map(a=>{let b=l[a.scenario];return`### Escenario ${b}

| M\xe9trica | Valor |
|---------|-------|
| Usuarios a\xf1o 1 | ${a.year1Users.toLocaleString("es-ES")} |
| Usuarios a\xf1o 2 | ${a.year2Users.toLocaleString("es-ES")} |
| Ingresos a\xf1o 1 | ${(0,k.vv)(a.year1Revenue)} |
| Ingresos a\xf1o 2 | ${(0,k.vv)(a.year2Revenue)} |
| CAC | ${(0,k.vv)(a.estimatedCAC)} |
| LTV | ${(0,k.vv)(a.estimatedLTV)} |
| Conversi\xf3n | ${a.estimatedConversion}% |
| Churn mensual | ${a.estimatedChurn}% |
| Break-even | ${a.breakEvenMonths?`${a.breakEvenMonths} meses`:"No alcanzado"} |
| Complejidad adquisici\xf3n | ${a.acquisitionComplexity} |

**Riesgo principal:** ${a.primaryRisk}`}).join("\n\n"),e=c.customAssumptions?"\n> ⚠ Supuestos personalizados por el usuario (custom assumptions)\n":"";return`${b}${e}
## Scores y recomendaci\xf3n

| M\xe9trica | Valor |
|---------|-------|
| Startup Score | ${c.startupScore}/100 |
| Venture Score | ${c.ventureScore}/100 |
| Recomendaci\xf3n | ${c.recommendationLabel} |
| Confianza | ${c.confidence} |

## Escenarios econ\xf3micos

${d}

## Riesgos

${(0,k.XS)(c.risks)}

## Oportunidades

${(0,k.XS)(c.opportunities)}

## Alternativas recomendadas

${(0,k.XS)(c.recommendedAlternatives)}

## Siguiente acci\xf3n sugerida

${(0,k.Sj)(c.suggestedNextAction)}

## Modelo de negocio (supuestos)

- **Modelo:** ${c.assumptions.businessModel}
- **Usuarios base a\xf1o 1:** ${c.assumptions.baseYear1Users.toLocaleString("es-ES")}
- **CAC base:** ${(0,k.vv)(c.assumptions.baseCAC)}
- **Burn mensual estimado:** ${(0,k.vv)(c.assumptions.monthlyBurnEstimate)}

---
*Simulaci\xf3n heur\xedstica — no sustituye validaci\xf3n con usuarios reales ni modelos financieros formales.*
`}function q(a){return a===k.eG?k.eG:a.replace(/^#\s+.+\n+/m,"").trim()}function r(a){let b=a.intelligenceReport,c=a.productPRD,d=a.researchReport,e=a.ventureSimulatorResult,f=c?.executiveSummary??q((0,k.Dg)(a,"resumen"))??a.ideaText,g=c?.problemStatement??b?.founderAdvisor.summary??k.eG,h=c?.valueProposition??c?.executiveSummary??k.eG,i=c?.targetCustomer??a.targetAudience,j=b?.recommendedBusinessModel??a.analysis?.market.modeloNegocio??k.eG,l=d?d.marketSummary:q((0,k.Dg)(a,"mercado")),m=d?d.competitors.map(a=>`**${a.name}** (${a.type})`).join("\n"):q((0,k.Dg)(a,"competidores")),n=d?(0,k.XS)(d.differentiationAngles):b?.competition.differentiationAngle??k.eG,o=(0,k.Dg)(a,"pricing"),p=(0,k.Dg)(a,"kpis"),r=c?`### 30 d\xedas
${(0,k.XS)(c.roadmap30_60_90.day30)}

### 60 d\xedas
${(0,k.XS)(c.roadmap30_60_90.day60)}

### 90 d\xedas
${(0,k.XS)(c.roadmap30_60_90.day90)}`:q((0,k.Dg)(a,"roadmap")),s=e?.risks.length?(0,k.XS)(e.risks):(0,k.XS)(b?.risks.map(a=>`${a.title}: ${a.description}`)),t=e?.opportunities.length?(0,k.XS)(e.opportunities):(0,k.XS)(b?.opportunities.map(a=>`${a.title}: ${a.description}`)),u=e?`**Venture Score:** ${e.ventureScore}/100  
**Startup Score:** ${e.startupScore}/100  
**Recomendaci\xf3n:** ${e.recommendationLabel}  
**Confianza:** ${e.confidence}`:b?`**Startup Score:** ${b.startupScore}/100 (Venture Simulator: ${k.eG})`:k.eG,v=e?.scenarios.map(a=>`#### ${a.scenario.charAt(0).toUpperCase()+a.scenario.slice(1)}
- Usuarios A1/A2: ${a.year1Users.toLocaleString("es-ES")} / ${a.year2Users.toLocaleString("es-ES")}
- Ingresos A1/A2: €${a.year1Revenue.toLocaleString("es-ES")} / €${a.year2Revenue.toLocaleString("es-ES")}
- CAC: €${a.estimatedCAC} \xb7 LTV: €${a.estimatedLTV} \xb7 Break-even: ${a.breakEvenMonths??"N/A"} meses`).join("\n\n")??k.eG,w=e?.suggestedNextAction??b?.founderAdvisor.recommendations.map(a=>a.text).join("\n")??k.eG;return`${(0,k.e7)(`Investor Pack — ${a.name}`,a)}
> Documento consolidado para inversores y stakeholders. Datos heur\xedsticos marcados como estimaciones.

## 1. Resumen ejecutivo

${(0,k.Sj)(f)}

## 2. Problema

${(0,k.Sj)(g)}

## 3. Soluci\xf3n

${(0,k.Sj)(h)}

## 4. Cliente objetivo

${(0,k.Sj)(i)}

## 5. Mercado

${(0,k.Sj)(l)}

## 6. Competidores

${(0,k.Sj)(m)}

## 7. Diferenciaci\xf3n

${(0,k.Sj)("string"==typeof n?n:String(n))}

## 8. Modelo de negocio

${(0,k.Sj)(j)}

## 9. Pricing

${o}

## 10. Venture Score

${u}

## 11. Escenarios (conservador / base / optimista)

${v}

## 12. Riesgos

${s}

## 13. Oportunidades

${t}

## 14. Roadmap

${r}

## 15. KPIs

${p}

## 16. Pr\xf3ximos pasos

${(0,k.Sj)("string"==typeof w?w:String(w))}

---
## Anexos

Los siguientes documentos completos est\xe1n disponibles como exportaciones individuales en ForgeOS.

- PRD
- Research Report
- Venture Simulator Report
- Product Roadmap

---
*ForgeOS Investor Pack v0.1 — Markdown. Exportaci\xf3n PDF planificada.*
`}function s(a){let b=a.intelligenceReport,c=a.productPRD,d=a.founderAdvisor,e=c?.problemStatement??(b?.founderAdvisor.summary?b.founderAdvisor.summary.slice(0,400):null)??a.ideaText,f=c?.valueProposition??c?.executiveSummary??b?.founderAdvisor.recommendations[0]?.text,g=(0,k.Dg)(a,"resumen")!==k.eG?(0,k.Dg)(a,"resumen"):c?.executiveSummary??b?.founderAdvisor.headline??a.ideaText,h=a.ventureSimulatorResult?.suggestedNextAction??b?.founderAdvisor.recommendations.map(a=>a.text).join("; ")??k.eG;return`${(0,k.e7)(`Project Brief — ${a.name}`,a)}
## Resumen ejecutivo

${g}

## Problema

${(0,k.Sj)(e)}

## Soluci\xf3n

${(0,k.Sj)(f)}

## Cliente objetivo

${(0,k.Sj)(c?.targetCustomer??a.targetAudience)}

## Modelo de negocio

${(0,k.Sj)(b?.recommendedBusinessModel??a.analysis?.market.modeloNegocio)}

## Mercado (snapshot)

${(0,k.Sj)(b?.market.tamEstimate??a.analysis?.market.mercadoEstimado)}

## Startup Score

${b?`${b.startupScore}/100 — ${b.launchPriority} prioridad`:k.eG}

## Founder Advisor

${d?.recommendation??b?.founderAdvisor.headline??k.eG}

### Riesgos clave

${(0,k.XS)(b?.risks.map(a=>`${a.title}: ${a.description}`)??[],5)}

## Pr\xf3ximos pasos

${(0,k.Sj)(h)}

---
*Documento generado por ForgeOS. Formato Markdown — exportaci\xf3n PDF planificada.*
`}var t=c(2252);function u(a){let b=(0,t.sK)(a);return(0,k.e7)(`Build Plan — ${a.name}`,a)+b.replace(/^# Build Plan[^\n]*\n+/m,"")}let v=[{kind:"project_brief",label:"Exportar Project Brief",description:"Resumen ejecutivo compacto del venture"},{kind:"investor_pack",label:"Exportar Investor Pack",description:"Documento completo para inversores"},{kind:"prd",label:"Exportar PRD",description:"Product Requirements Document"},{kind:"research",label:"Exportar Research",description:"Informe de mercado y competencia"},{kind:"simulator",label:"Exportar Simulator Report",description:"Venture Score y escenarios econ\xf3micos"},{kind:"build_plan",label:"Exportar Build Plan",description:"Handoff t\xe9cnico para Cursor / Claude"}];c(79947);async function w(a){}let x={project_brief:"Project Brief",investor_pack:"Investor Pack",prd:"PRD",research:"Research Report",simulator:"Venture Simulator Report",roadmap:"Product Roadmap",build_plan:"Build Plan"};var y=c(70284),z=c(86474),A=c(83851);function B({venture:a}){let[b,c]=(0,e.useState)(!1),[f,h]=(0,e.useState)(!1),i=(0,e.useRef)(null);async function j(){h(!0);try{await w(a)}finally{h(!1),c(!1)}}return(0,d.jsxs)("div",{className:"venture-export-menu",ref:i,children:[(0,d.jsxs)(y.$,{type:"button",variant:"secondary",size:"sm",className:"venture-export-trigger",onClick:()=>c(a=>!a),"aria-expanded":b,"aria-haspopup":"menu",children:["Exportar",(0,d.jsx)("svg",{width:"14",height:"14",viewBox:"0 0 14 14",fill:"none","aria-hidden":!0,children:(0,d.jsx)("path",{d:"M3 5l4 4 4-4",stroke:"currentColor",strokeWidth:"1.5",strokeLinecap:"round"})})]}),b&&(0,d.jsxs)(z.Zk,{className:"venture-export-dropdown",role:"menu",children:[(0,d.jsx)("span",{className:"venture-export-group-label",children:"Markdown"}),v.map(b=>(0,d.jsxs)("button",{type:"button",role:"menuitem",className:"venture-export-item",onClick:()=>(function(b){let d={kind:b,format:"markdown",filename:(0,k.mK)(a,b),title:x[b],content:function(a,b){switch(b){case"project_brief":return s(a);case"investor_pack":return r(a);case"prd":return m(a);case"research":return n(a);case"simulator":return p(a);case"roadmap":return o(a);case"build_plan":return u(a);default:return b}}(a,b)};(0,k.g_)(d.content,d.filename),c(!1)})(b.kind),children:[(0,d.jsxs)("strong",{children:[b.label.replace("Exportar ",""),(0,d.jsx)("span",{className:"venture-export-ext",children:".md"})]}),(0,d.jsx)("span",{children:b.description})]},b.kind)),(0,d.jsx)("span",{className:"venture-export-group-label",children:"PDF y paquete"}),(0,d.jsxs)(g(),{href:`/venture/${a.id}/print`,target:"_blank",rel:"noopener noreferrer",role:"menuitem",className:(0,A.cn)("venture-export-item","venture-export-link"),onClick:()=>c(!1),children:[(0,d.jsx)("strong",{children:"Ver versi\xf3n imprimible / PDF"}),(0,d.jsx)("span",{children:"Investor Pack con portada e \xedndice — usar Imprimir → Guardar como PDF"})]}),(0,d.jsxs)("button",{type:"button",role:"menuitem",className:"venture-export-item",onClick:j,disabled:f,children:[(0,d.jsxs)("strong",{children:["Exportar paquete completo",(0,d.jsx)("span",{className:"venture-export-ext",children:".zip"})]}),(0,d.jsx)("span",{children:f?"Generando paquete…":"7 documentos Markdown + README (ZIP o descarga m\xfaltiple)"})]})]})]})}},75434:(a,b,c)=>{c.d(b,{Dg:()=>h,Sj:()=>l,XS:()=>k,e7:()=>m,eG:()=>d,gH:()=>i,g_:()=>n,mK:()=>g,rn:()=>e,vv:()=>j});let d="*Pendiente de completar*";function e(a){return a.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,60)||"venture"}let f={project_brief:"project-brief",investor_pack:"investor-pack",prd:"prd",research:"research",simulator:"simulator-report",roadmap:"roadmap",build_plan:"build-plan"};function g(a,b){let c=e(a.name),d=new Date().toISOString().slice(0,10);return`forgeos-${c}-${f[b]}-${d}.md`}function h(a,b){let c=a.sections.find(a=>a.id===b);return c?.content?.trim()?c.content.trim():d}function i(a){try{return new Date(a).toLocaleDateString("es-ES",{year:"numeric",month:"long",day:"numeric"})}catch{return a}}function j(a){return a>=1e6?`€${(a/1e6).toFixed(2)}M`:a>=1e3?`€${Math.round(a/1e3)}K`:`€${a}`}function k(a,b){return a?.length?(b?a.slice(0,b):a).map(a=>`- ${a}`).join("\n"):d}function l(a){return null!=a&&("string"!=typeof a||a.trim())?String(a):d}function m(a,b){return`# ${a}

**Proyecto:** ${b.name}  
**Generado por:** ForgeOS App Factory  
**Fecha:** ${i(new Date().toISOString())}  
**Venture ID:** ${b.id}

---

`}function n(a,b){}},79947:(a,b,c)=>{c.d(b,{vl:()=>g,QB:()=>h});var d=c(75434),e=c(54287);function f(a){return a?.trim()&&a.trim()!==d.eG.replace(/\*/g,"")?a.trim():d.eG}function g(a){let b=a.intelligenceReport,c=a.productPRD,g=a.researchReport,h=a.ventureSimulatorResult??(0,e.zL)((0,e.tf)(a)),i=(0,d.Dg)(a,"resumen"),j=f(c?.executiveSummary??(i!==d.eG?i.replace(/^#.*\n+/m,""):void 0)??a.ideaText),k=h?`Venture Score: ${h.ventureScore}/100
Startup Score: ${h.startupScore}/100
Recomendaci\xf3n: ${h.recommendationLabel}
Confianza: ${h.confidence}`:b?`Startup Score: ${b.startupScore}/100
${d.eG}`:d.eG,l=h?.scenarios.length?h.scenarios.map(a=>`${a.scenario.toUpperCase()}
  Usuarios A1/A2: ${a.year1Users.toLocaleString("es-ES")} / ${a.year2Users.toLocaleString("es-ES")}
  Ingresos A1/A2: ${(0,d.vv)(a.year1Revenue)} / ${(0,d.vv)(a.year2Revenue)}
  CAC: ${(0,d.vv)(a.estimatedCAC)} \xb7 LTV: ${(0,d.vv)(a.estimatedLTV)}
  Conversi\xf3n: ${a.estimatedConversion}% \xb7 Churn: ${a.estimatedChurn}%
  Break-even: ${a.breakEvenMonths?`${a.breakEvenMonths} meses`:"No alcanzado"}
  Riesgo: ${a.primaryRisk}`).join("\n\n"):d.eG,m=g?`RESUMEN DE MERCADO
${g.marketSummary}

SEGMENTOS
${g.targetSegments.map(a=>`• ${a}`).join("\n")}

COMPETIDORES
${g.competitors.map(a=>`• ${a.name} (${a.type})`).join("\n")}

OPORTUNIDADES
${g.opportunities.map(a=>`• ${a}`).join("\n")}

DIFERENCIACI\xd3N
${g.differentiationAngles.map(a=>`• ${a}`).join("\n")}`:f((0,d.Dg)(a,"mercado"))+"\n\n"+f((0,d.Dg)(a,"competidores")),n=c?`PROBLEMA
${c.problemStatement}

SOLUCI\xd3N / PROPUESTA DE VALOR
${c.valueProposition}

CLIENTE
${c.targetCustomer}

MVP SCOPE
${c.mvpScope.map(a=>`• ${a}`).join("\n")}

USER STORIES
${c.userStories.slice(0,8).map(a=>`• ${a}`).join("\n")}`:f((0,d.Dg)(a,"prd")),o=c?`30 D\xcdAS
${c.roadmap30_60_90.day30.map(a=>`• ${a}`).join("\n")}

60 D\xcdAS
${c.roadmap30_60_90.day60.map(a=>`• ${a}`).join("\n")}

90 D\xcdAS
${c.roadmap30_60_90.day90.map(a=>`• ${a}`).join("\n")}`:f((0,d.Dg)(a,"roadmap")),p=f((0,d.Dg)(a,"kpis")),q=f(h?.suggestedNextAction??b?.founderAdvisor.recommendations.map(a=>a.text).join("\n")),r=[{id:"resumen",title:"Resumen ejecutivo",body:j,isPending:j===d.eG},{id:"scores",title:"Venture Score y recomendaci\xf3n",body:k,isPending:k.includes(d.eG)},{id:"escenarios",title:"Escenarios econ\xf3micos",body:l,isPending:l===d.eG},{id:"research",title:"Research",body:m,isPending:m.includes(d.eG)},{id:"prd",title:"PRD",body:n,isPending:n===d.eG},{id:"roadmap",title:"Roadmap",body:o,isPending:o===d.eG},{id:"kpis",title:"KPIs",body:p,isPending:p===d.eG},{id:"next-steps",title:"Pr\xf3ximos pasos",body:q,isPending:q===d.eG}].map((a,b)=>({...a,number:b+1}));return{ventureName:a.name,ventureId:a.id,generatedAt:new Date().toISOString(),category:a.category,targetAudience:a.targetAudience,ventureScore:h?`${h.ventureScore}/100`:b?`${b.startupScore}/100`:d.eG,recommendation:h?.recommendationLabel??d.eG,confidence:h?.confidence??d.eG,sections:r,toc:r.map(a=>({number:a.number,title:a.title,id:a.id}))}}function h(){}},81025:(a,b,c)=>{c.d(b,{I:()=>f});var d=c(30185),e=c(99351);function f(a){return(0,e.kk)(a)??(0,d.J7)(a)}},81453:(a,b,c)=>{function d(a,b){return`# An\xe1lisis de mercado

> Generado por Research Worker (${b})

## Resumen
${a.marketSummary}

## Segmentos objetivo
${a.targetSegments.map(a=>`- ${a}`).join("\n")}

## Riesgos de mercado
${a.marketRisks.map(a=>`- ${a}`).join("\n")}

## Oportunidades
${a.opportunities.map(a=>`- ${a}`).join("\n")}

## Plan de validaci\xf3n
${a.validationPlan.map((a,b)=>`${b+1}. ${a}`).join("\n")}`}function e(a,b){return`# Competidores

> Generado por Research Worker (${b})

${a.competitors.map(a=>`## ${a.name}
**Tipo:** ${a.type}

**Fortalezas**
${a.strengths.map(a=>`- ${a}`).join("\n")}

**Debilidades**
${a.weaknesses.map(a=>`- ${a}`).join("\n")}`).join("\n\n")}

## \xc1ngulos de diferenciaci\xf3n
${a.differentiationAngles.map(a=>`- ${a}`).join("\n")}`}function f(a){return`## Insights de Research

### Oportunidades detectadas
${a.opportunities.map(a=>`- ${a}`).join("\n")}

### Preguntas recomendadas
${a.recommendedNextQuestions.map(a=>`- ${a}`).join("\n")}`}c.d(b,{Du:()=>f,Mb:()=>d,l4:()=>e})},92805:(a,b,c)=>{c.d(b,{c:()=>f});var d=c(21124),e=c(83851);function f({label:a,value:b,delta:c,className:f}){return(0,d.jsxs)("div",{className:(0,e.cn)("fhis-kpi-block",f),children:[(0,d.jsx)("span",{className:"fhis-kpi-label",children:a}),(0,d.jsx)("span",{className:"fhis-kpi-value",children:b}),void 0!==c&&(0,d.jsxs)("span",{className:(0,e.cn)("fhis-kpi-delta",c>=0?"fhis-kpi-delta-up":"fhis-kpi-delta-down"),children:[c>=0?"↑":"↓"," ",Math.abs(c),"%"]})]})}}};