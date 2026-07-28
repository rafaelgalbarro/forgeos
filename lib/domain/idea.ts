export interface IdeaInput {
  text: string;
}

export interface DetectedTag {
  id: string;
  label: string;
  category: "product" | "business" | "tech" | "model";
}

export interface MarketAnalysis {
  mercadoEstimado: string;
  competencia: string;
  nivelInnovacion: string;
  complejidadTecnica: string;
  probabilidadExito: string;
  tiempoMvp: string;
  costeDesarrollo: string;
  modeloNegocio: string;
  escalabilidad: string;
}

export interface IdeaAnalysis {
  tags: DetectedTag[];
  market: MarketAnalysis;
  category: string;
  targetAudience: string;
  projectName: string;
}
