/** Executive Intelligence Mesh — department registry (RC3.5). */

import type { MeshDepartment, MeshDepartmentId } from "./types";

export const MESH_DEPARTMENTS: MeshDepartment[] = [
  { id: "ceo", label: "CEO", role: "Director General", reportsTo: null, specialties: ["strategy", "priorities", "portfolio"], boardSeat: true },
  { id: "cto", label: "CTO", role: "Chief Technology Officer", reportsTo: "ceo", specialties: ["technology", "architecture"], boardSeat: true },
  { id: "cpo", label: "CPO", role: "Chief Product Officer", reportsTo: "ceo", specialties: ["product", "roadmap"], boardSeat: true },
  { id: "cmo", label: "CMO", role: "Chief Marketing Officer", reportsTo: "ceo", specialties: ["marketing", "growth"], boardSeat: true },
  { id: "cfo", label: "CFO", role: "Chief Financial Officer", reportsTo: "ceo", specialties: ["finance", "runway"], boardSeat: true },
  { id: "coo", label: "COO", role: "Chief Operating Officer", reportsTo: "ceo", specialties: ["operations", "execution"], boardSeat: true },
  { id: "research", label: "Research", role: "Market Intelligence", reportsTo: "cpo", specialties: ["market", "competitors"] },
  { id: "product", label: "Product", role: "Product Management", reportsTo: "cpo", specialties: ["prd", "mvp"] },
  { id: "ux", label: "UX", role: "User Experience", reportsTo: "cpo", specialties: ["design", "usability"] },
  { id: "architecture", label: "Architecture", role: "System Architecture", reportsTo: "cto", specialties: ["systems", "scalability"] },
  { id: "backend", label: "Backend", role: "Backend Engineering", reportsTo: "architecture", specialties: ["api", "services"] },
  { id: "frontend", label: "Frontend", role: "Frontend Engineering", reportsTo: "architecture", specialties: ["ui", "web"] },
  { id: "qa", label: "QA", role: "Quality Assurance", reportsTo: "cto", specialties: ["testing", "quality"] },
  { id: "security", label: "Security", role: "Security & Compliance", reportsTo: "cto", specialties: ["security", "risk"] },
  { id: "legal", label: "Legal", role: "Legal Affairs", reportsTo: "ceo", specialties: ["compliance", "contracts"], boardSeat: true },
  { id: "growth", label: "Growth", role: "Growth", reportsTo: "cmo", specialties: ["acquisition", "retention"], boardSeat: true },
  { id: "sales", label: "Sales", role: "Sales", reportsTo: "cmo", specialties: ["revenue", "pipeline"] },
  { id: "customer-success", label: "Customer Success", role: "Customer Success", reportsTo: "coo", specialties: ["retention", "nps"] },
  { id: "support", label: "Support", role: "Customer Support", reportsTo: "coo", specialties: ["tickets", "sla"] },
  { id: "finance", label: "Finance", role: "Finance Ops", reportsTo: "cfo", specialties: ["budget", "forecast"] },
  { id: "capital", label: "Capital", role: "Capital & Investment", reportsTo: "cfo", specialties: ["fundraising", "runway"] },
  { id: "knowledge", label: "Knowledge", role: "Knowledge Management", reportsTo: "ceo", specialties: ["docs", "insights"] },
  { id: "analytics", label: "Analytics", role: "Data & Analytics", reportsTo: "coo", specialties: ["metrics", "kpis"] },
  { id: "deployment", label: "Deployment", role: "Release & Deploy", reportsTo: "cto", specialties: ["release", "ci-cd"] },
  { id: "infrastructure", label: "Infrastructure", role: "Infrastructure", reportsTo: "cto", specialties: ["cloud", "ops"] },
];

export function getDepartment(id: MeshDepartmentId): MeshDepartment | undefined {
  return MESH_DEPARTMENTS.find((d) => d.id === id);
}

export function getBoardDepartments(): MeshDepartment[] {
  return MESH_DEPARTMENTS.filter((d) => d.boardSeat);
}

export function getDepartmentChain(from: MeshDepartmentId, to: MeshDepartmentId): MeshDepartmentId[] {
  const chain: MeshDepartmentId[] = [from];
  let current = from;
  const visited = new Set<MeshDepartmentId>([from]);
  while (current !== to) {
    const dept = getDepartment(current);
    if (!dept?.reportsTo || visited.has(dept.reportsTo)) break;
    chain.push(dept.reportsTo);
    visited.add(dept.reportsTo);
    current = dept.reportsTo;
    if (chain.length > 10) break;
  }
  if (current !== to && !chain.includes(to)) chain.push(to);
  return chain;
}
