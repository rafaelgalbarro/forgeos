"use strict";exports.id=5015,exports.ids=[4634,5015],exports.modules={32706:(a,b,c)=>{function d(a,b,c){let d=b=>a.find(a=>a.id===b)?.status==="completed",f=e(a,["idea","research","market","prd"]),g=e(a,["architecture","build-context","prd"]),h=e(a,["build-dna","deployment-preview","landing"]),i=c?.investorReadiness.score??b.businessScore,j=e(a,["go-to-market","launch-checklist","investor-readiness","brand"]);return{prototypeReady:f>=70&&d("prd"),mvpReady:g>=65&&d("build-context"),betaReady:h>=55&&d("deployment-preview"),investorReady:i>=60,launchReady:j>=75&&b.overallVentureScore>=65,prototypeScore:f,mvpScore:g,betaScore:h,investorScore:i,launchScore:j}}function e(a,b){let c=a.filter(a=>b.includes(a.id));if(!c.length)return 0;let d={completed:100,in_progress:55,not_started:10,blocked:0};return Math.round(c.reduce((a,b)=>a+d[b.status],0)/c.length)}c.d(b,{W:()=>d})},34634:(a,b,c)=>{c.d(b,{E2E_PIPELINE:()=>d,j:()=>e});let d=[{id:"idea",label:"Idea",order:1,moduleUsed:"Venture Factory"},{id:"research",label:"Research",order:2,moduleUsed:"AI Runtime + Venture Intelligence"},{id:"market",label:"Mercado",order:3,moduleUsed:"Venture Intelligence / market-score"},{id:"competitors",label:"Competidores",order:4,moduleUsed:"Research Report + Intelligence"},{id:"business-model",label:"Business Model",order:5,moduleUsed:"Discovery + Intelligence"},{id:"pricing",label:"Pricing",order:6,moduleUsed:"Venture sections + Intelligence"},{id:"brand",label:"Brand",order:7,moduleUsed:"Venture Factory + Intelligence tags"},{id:"landing",label:"Landing",order:8,moduleUsed:"lib/launch + Venture sections"},{id:"prd",label:"PRD",order:9,moduleUsed:"AI Runtime Prompt Compiler"},{id:"architecture",label:"Architecture",order:10,moduleUsed:"Build Platform / Architecture"},{id:"build-context",label:"Build Context",order:11,moduleUsed:"lib/build-platform/build-context"},{id:"build-dna",label:"Build DNA",order:12,moduleUsed:"lib/build-platform/build-dna"},{id:"deployment-preview",label:"Deploy Preview Plan",order:13,moduleUsed:"lib/build-pipeline"},{id:"investor-readiness",label:"Investor Readiness",order:14,moduleUsed:"Venture Intelligence / due-diligence"},{id:"go-to-market",label:"GTM",order:15,moduleUsed:"Founder Journey + GTM sections"},{id:"launch-checklist",label:"Launch Checklist",order:16,moduleUsed:"lib/launch + Self Evolution"}],e=["research","product","finance","cmo","legal","architecture","backend","qa","growth","capital"]},35015:(a,b,c)=>{c.d(b,{runVentureE2EEngine:()=>u});var d=c(12489),e=c(90734),f=c(21061),g=c(58423),h=c(1622),i=c(68223),j=c(98089),k=c(75190),l=c(48212),m=c(83817),n=c(17434),o=c(34634),p=c(50290),q=c(32706),r=c(60678),s=c(23509),t=c(67737);async function u(a){let b=(0,s.resolveVentureFixture)(a);if(!b||!(0,s.RA)(b.venture))throw Error(`Venture fixture no encontrado: ${a}`);let c=b.venture,u=[c],v=(0,e.Wl)(u),w=(0,d.LD)(u,v),x=null;try{x=(0,k.buildVentureIntelligenceSnapshot)((0,m.Bh)(c))}catch{x=null}let y=null;try{y=(0,h.tP)(c)}catch{y=null}let z=null;if(y)try{z=(0,i.XG)(y)}catch{z=null}let A=null;try{A=await (0,j.je)(c.id,"venture-e2e")}catch{A=null}let B=null;try{B=await (0,f.GR)({ventureId:c.id,ventureName:c.name,topic:`Pipeline E2E — ${c.name}`,urgency:"medium"},c)}catch{B=null}let C=(0,p.F)(c,{buildContext:y,buildDna:z,pipeline:A,intelligence:x}),D=function(a){let b=a.length,c=a.filter(a=>"completed"===a.status).length,d=b>0?Math.round(c/b*100):0,e=a.find(a=>"in_progress"===a.status||"blocked"===a.status)??a.find(a=>"not_started"===a.status)??null;return{completedCount:c,totalCount:b,percent:d,currentStageId:e?.id??null,currentStageLabel:e?.label??null}}(C),E=(0,n.$)(C),F=(0,m.jC)(c,x,C),G=(0,q.W)(C,F,x),H=function(a,b,c){let d=b.executiveSummary,e=(0,l.$G)(a),f=e.phases.find(a=>"active"===a.status)?.nextAction?.label??e.summary.currentPhaseLabel;return{executiveSummary:`${a.name}: pipeline E2E al ${c}%. `+d.ceoMessage+` Prioridad: ${d.topPriority}.`,currentRisks:b.criticalRisks.map(a=>a.label).slice(0,5),recommendations:[b.recommendation.action,b.recommendation.rationale].filter(Boolean).slice(0,5),nextActions:[b.topPriority?.action??"Completar etapas pendientes del pipeline",a.productPRD?.mvpScope?.[0]?`MVP: ${a.productPRD.mvpScope[0]}`:"",f].filter(Boolean).slice(0,4),overallReadiness:c>=75?"Listo para siguiente fase":c>=50?"En progreso s\xf3lido":"Requiere m\xe1s validaci\xf3n",confidenceScore:Math.min(95,Math.round((a.intelligenceReport?.startupScore??60)*.85+.15*c))}}(c,w,D.percent),I=function(a,b){let c={research:["research","competitors","market"],product:["prd","idea"],finance:["business-model","pricing"],cmo:["brand","landing","go-to-market"],legal:["launch-checklist"],architecture:["architecture"],backend:["architecture","build-context"],qa:["launch-checklist"],growth:["go-to-market","landing"],capital:["investor-readiness"]};return o.j.map(d=>{let e=(0,g.D9)(d),f=b.filter(a=>c[d]?.includes(a.id)),h=f.filter(a=>"completed"===a.status),i=[...new Set(f.flatMap(a=>a.risks))].slice(0,3),j=[...new Set(f.flatMap(a=>a.pending))].slice(0,3),k=[...new Set(f.flatMap(a=>a.recommendations))].slice(0,2);return{departmentId:d,label:e?.label??d,result:h.length>0?`${h.length}/${f.length} etapas completadas para ${a.name}`:f.length>0?`Participaci\xf3n en ${f.map(a=>a.label).join(", ")}`:"Sin etapas asignadas en este ciclo",risks:i,pending:j,recommendations:k}})}(c,C),J=(0,r.p)(c.name,C,F,G,H,m.Hq);return{version:t.C,disclaimer:t.r,venture:c,ventureSlug:b.slug,stages:C,progress:D,health:E,scores:F,readiness:G,ceo:H,departments:I,intelligence:x,buildContext:y,buildDna:z,buildPipeline:A,mesh:B,ceoEngine:w,reports:J,reusedModules:m.Hq,computedAt:new Date().toISOString()}}},50290:(a,b,c)=>{c.d(b,{F:()=>g});var d=c(34634);function e(a,b){return a.sections.some(a=>a.id===b&&a.content.trim().length>0)}function f(a,b,c){let d=b.intelligenceReport,f=b.researchReport,g=b.productPRD;switch(a){case"idea":return b.ideaText?.trim()?{status:"completed",summary:b.ideaText.slice(0,120),risks:[],pending:[],recommendations:[]}:{status:"not_started",summary:"Sin idea definida",risks:["Sin propuesta de valor"],pending:["Definir idea"],recommendations:["Completar discovery"]};case"research":return f?{status:"completed",summary:f.marketSummary.slice(0,100),risks:f.marketRisks.slice(0,2),pending:[],recommendations:f.validationPlan?.slice(0,1)??[]}:{status:"in_progress",summary:"Research parcial",risks:["Datos de mercado incompletos"],pending:["Generar research report"],recommendations:["Ejecutar AI Runtime research"]};case"market":return d?.market?{status:"completed",summary:`TAM: ${d.market.tamEstimate}`,risks:d.risks.map(a=>a.title).slice(0,2),pending:[],recommendations:d.opportunities.map(a=>a.title).slice(0,1)}:{status:"in_progress",summary:"Mercado en evaluaci\xf3n",risks:[],pending:["TAM/SAM"],recommendations:["Venture Intelligence market score"]};case"competitors":return f?.competitors?.length?{status:"completed",summary:`${f.competitors.length} competidores analizados`,risks:[],pending:[],recommendations:[]}:e(b,"competidores")?{status:"completed",summary:"Competidores en secciones",risks:[],pending:[],recommendations:[]}:{status:"blocked",summary:"Sin an\xe1lisis competitivo",risks:["Posicionamiento indefinido"],pending:["Mapear competidores"],recommendations:["Usar Research engine"]};case"business-model":return d?.businessModel||b.discoveryContext?.inferredBusinessModel?{status:"completed",summary:d?.recommendedBusinessModel??b.discoveryContext?.inferredBusinessModel??"",risks:[],pending:[],recommendations:[]}:{status:"in_progress",summary:"Modelo pendiente",risks:["Monetizaci\xf3n no validada"],pending:["Definir modelo"],recommendations:["Founder Advisor"]};case"pricing":return e(b,"pricing")||d?.recommendedBusinessModel?{status:e(b,"pricing")?"completed":"in_progress",summary:e(b,"pricing")?"Pricing documentado":"Inferido desde business model",risks:[],pending:e(b,"pricing")?[]:["Tabla de precios"],recommendations:["Validar willingness to pay"]}:{status:"not_started",summary:"Sin pricing",risks:["Unit economics desconocidos"],pending:["Pricing tiers"],recommendations:["Venture Simulator"]};case"brand":return(d?.tags?.length??0)>0||e(b,"ux")?{status:"completed",summary:`${d?.tags?.length??0} tags de marca`,risks:[],pending:[],recommendations:[]}:{status:"in_progress",summary:"Brand parcial",risks:[],pending:["Gu\xeda de marca"],recommendations:["Definir tono visual"]};case"landing":return e(b,"landing")?{status:"completed",summary:"Landing planificada",risks:[],pending:[],recommendations:[]}:{status:"not_started",summary:"Sin landing",risks:["Sin canal de captaci\xf3n"],pending:["Landing page"],recommendations:["lib/launch LandingPage"]};case"prd":return g?{status:"completed",summary:g.executiveSummary.slice(0,100),risks:g.risks?.slice(0,2)??[],pending:[],recommendations:g.mvpScope?.slice(0,1)??[]}:{status:"blocked",summary:"PRD ausente",risks:["Scope indefinido"],pending:["Generar PRD"],recommendations:["Prompt Compiler + Context Engine"]};case"architecture":return e(b,"arquitectura")?{status:"completed",summary:"Arquitectura documentada",risks:[],pending:[],recommendations:[]}:{status:"not_started",summary:"Sin arquitectura",risks:["Deuda t\xe9cnica temprana"],pending:["Diagrama sistema"],recommendations:["Architecture department"]};case"build-context":return c.buildContext&&c.buildContext.meta.completenessScore>=40?{status:"completed",summary:`Build Context ${c.buildContext.meta.completenessScore}%`,risks:[],pending:[],recommendations:[]}:c.buildContext?{status:"in_progress",summary:`Build Context ${c.buildContext.meta.completenessScore}%`,risks:[],pending:["Completar secciones"],recommendations:["rebuildBuildContext"]}:{status:"not_started",summary:"Sin Build Context",risks:[],pending:["Generar context"],recommendations:["buildBuildContextFromVenture"]};case"build-dna":return c.buildDna?{status:"completed",summary:`DNA ${c.buildDna.meta.completenessScore}% — ${c.buildDna.meta.ventureName}`,risks:[],pending:[],recommendations:[]}:{status:"not_started",summary:"Sin Build DNA",risks:[],pending:["Generar DNA"],recommendations:["createBuildDnaFromContext"]};case"deployment-preview":return c.pipeline?{status:"dry_run"===c.pipeline.mode?"completed":"in_progress",summary:`Pipeline ${c.pipeline.mode}`,risks:c.pipeline.risk?.factors?.slice(0,2)??[],pending:[],recommendations:["Approval antes de deploy real"]}:{status:"not_started",summary:"Sin preview",risks:[],pending:["Dry-run pipeline"],recommendations:["runBuildPipelineDryRun"]};case"investor-readiness":return c.intelligence&&c.intelligence.investorReadiness.score>=50?{status:"completed",summary:`Readiness ${c.intelligence.investorReadiness.score}%`,risks:c.intelligence.risks.topRisks.slice(0,2),pending:[],recommendations:[c.intelligence.investorReadiness.recommendedNextStep]}:{status:"in_progress",summary:"Investor readiness parcial",risks:[],pending:["Data room"],recommendations:["assessInvestorReadiness"]};case"go-to-market":return e(b,"landing")&&(e(b,"kpis")||e(b,"roadmap"))?{status:"completed",summary:"GTM planificado",risks:[],pending:[],recommendations:[]}:e(b,"landing")?{status:"in_progress",summary:"GTM parcial",risks:[],pending:["KPIs GTM"],recommendations:["Growth department"]}:{status:"not_started",summary:"Sin GTM",risks:["Lanzamiento sin canal"],pending:["Plan GTM"],recommendations:["Founder Journey finalize"]};case"launch-checklist":return c.completedRatio>=.75?{status:"completed",summary:`${Math.round(100*c.completedRatio)}% pipeline completado`,risks:[],pending:[],recommendations:["Revisi\xf3n CEO final"]}:c.completedRatio>=.4?{status:"in_progress",summary:`${Math.round(100*c.completedRatio)}% completado`,risks:["Etapas cr\xedticas pendientes"],pending:["Completar bloqueados"],recommendations:["Priorizar PRD y Build Context"]}:{status:"blocked",summary:"Launch no listo",risks:["Pipeline incompleto"],pending:["Completar etapas base"],recommendations:["Ejecutar validaci\xf3n completa"]};default:return{status:"not_started",summary:"",risks:[],pending:[],recommendations:[]}}}function g(a,b){let c=d.E2E_PIPELINE.map(c=>{let d=f(c.id,a,{...b,completedRatio:0});return{def:c,eval_:d}}).filter(a=>"completed"===a.eval_.status).length/d.E2E_PIPELINE.length;return d.E2E_PIPELINE.map(d=>{let e=f(d.id,a,{...b,completedRatio:c});return{id:d.id,label:d.label,order:d.order,status:e.status,moduleUsed:d.moduleUsed,resultSummary:e.summary,risks:e.risks,pending:e.pending,recommendations:e.recommendations}})}},60678:(a,b,c)=>{function d(a,b,c,d,e,f){let g=b.filter(a=>"completed"===a.status),h=b.filter(a=>"blocked"===a.status),i=b.map(a=>`| ${a.order} | ${a.label} | ${a.status} | ${a.moduleUsed} |`).join("\n"),j=`# Executive Report — ${a}

**Program 10000 — Venture E2E Pipeline**

## Executive Summary
${e.executiveSummary}

## Overall Venture Score: ${c.overallVentureScore}/100
## Confidence: ${e.confidenceScore}%

## Current Risks
${e.currentRisks.map(a=>`- ${a}`).join("\n")||"- Ninguno cr\xedtico"}

## Recommendations
${e.recommendations.map(a=>`- ${a}`).join("\n")}

## Next Actions
${e.nextActions.map(a=>`- ${a}`).join("\n")}

## Progress
- Completados: ${g.length}/${b.length}
- Bloqueados: ${h.length}
- Readiness: ${e.overallReadiness}
`,k=`# Business Plan — ${a}

## Scores
| Dimensi\xf3n | Score |
|-----------|-------|
| Market | ${c.marketScore} |
| Business | ${c.businessScore} |
| Product | ${c.productScore} |
| Growth | ${c.growthScore} |
| Financial | ${c.financialScore} |
| Risk | ${c.riskScore} |

## Business Model & Pricing
${b.filter(a=>["business-model","pricing","market"].includes(a.id)).map(a=>`- **${a.label}** (${a.status}): ${a.resultSummary}`).join("\n")}

## Readiness
- Prototype: ${d.prototypeReady?"✓":"○"} (${d.prototypeScore}%)
- MVP: ${d.mvpReady?"✓":"○"} (${d.mvpScore}%)
- Beta: ${d.betaReady?"✓":"○"} (${d.betaScore}%)
- Launch: ${d.launchReady?"✓":"○"} (${d.launchScore}%)
`,l=`# Technical Architecture — ${a}

## Pipeline t\xe9cnico
| # | Etapa | Estado | M\xf3dulo |
|---|-------|--------|--------|
${i}

## Build & Deploy
- Build Context / DNA integrados v\xeda Build Platform
- Deployment Preview v\xeda Build Pipeline (dry-run)

## Etapas bloqueadas
${h.map(a=>`- **${a.label}**: ${a.resultSummary}`).join("\n")||"- Ninguna"}

## Pendientes t\xe9cnicos
${b.filter(a=>["architecture","build-context","build-dna","deployment-preview"].includes(a.id)&&"completed"!==a.status).map(a=>`- ${a.label}`).join("\n")||"- Ninguno"}
`;return{executive:j,businessPlan:k,technicalArchitecture:l,investorReadiness:`# Investor Readiness — ${a}

## Investor Readiness: ${d.investorScore}%
## Overall Venture Score: ${c.overallVentureScore}/100

## Financial Score: ${c.financialScore}/100
## Risk Score: ${c.riskScore}/100

## Recomendaci\xf3n CEO
${e.recommendations.slice(0,3).map(a=>`- ${a}`).join("\n")}
`,launchPlan:`# Launch Plan — ${a}

## Launch Ready: ${d.launchReady?"S\xcd":"NO"} (${d.launchScore}%)

## Checklist GTM
${b.filter(a=>["landing","go-to-market","launch-checklist","pricing","brand"].includes(a.id)).map(a=>`- [${"completed"===a.status?"x":" "}] ${a.label}`).join("\n")}

## M\xf3dulos reutilizados
${f.map(a=>`- **${a.label}** (\`${a.path}\`) — ${a.role}`).join("\n")}
`}}function e(a){let b=a.stages.filter(a=>"blocked"===a.status),c=a.stages.filter(a=>"completed"===a.status);return`## PROGRAM 10000 — INFORME FINAL

### Venture: ${a.venture.name} (${a.ventureSlug})

### M\xf3dulos reutilizados
${a.reusedModules.map(a=>`- ${a.label}: \`${a.path}\``).join("\n")}

### Venture Score: **${a.scores.overallVentureScore}/100**
- Market: ${a.scores.marketScore} | Business: ${a.scores.businessScore} | Execution: ${a.scores.executionScore}
- Product: ${a.scores.productScore} | Financial: ${a.scores.financialScore} | Growth: ${a.scores.growthScore} | Risk: ${a.scores.riskScore}

### Readiness
- Prototype: ${a.readiness.prototypeReady} | MVP: ${a.readiness.mvpReady} | Beta: ${a.readiness.betaReady}
- Investor: ${a.readiness.investorReady} (${a.readiness.investorScore}%) | Launch: ${a.readiness.launchReady} (${a.readiness.launchScore}%)

### Riesgos
${a.ceo.currentRisks.map(a=>`- ${a}`).join("\n")||"- Sin riesgos cr\xedticos"}

### Bloqueados (${b.length})
${b.map(a=>`- ${a.label}`).join("\n")||"- Ninguno"}

### Completados (${c.length}/${a.stages.length})
${c.map(a=>`- ${a.label}`).join("\n")}
`}c.d(b,{p:()=>d,s:()=>e})}};