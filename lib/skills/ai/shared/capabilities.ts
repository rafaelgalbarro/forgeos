/** ForgeOS AI Capability Skills — domain configurations (RC4.7). */

import type { AICapabilityConfig } from "../types";

export const REASONING_CONFIG: AICapabilityConfig = {
  id: "ai-reasoning",
  name: "AI Reasoning",
  domain: "reasoning",
  capability: "chain_of_thought_analysis_planning",
  runtimeTask: "research",
  risks: ["ai_cost", "content_generation"],
  actions: [
    { id: "chain_of_thought", name: "Chain of Thought", risk: "LOW" },
    { id: "analyze", name: "Analyze", risk: "LOW" },
    { id: "plan", name: "Plan", risk: "MEDIUM" },
  ],
};

export const CODING_CONFIG: AICapabilityConfig = {
  id: "ai-coding",
  name: "AI Coding",
  domain: "coding",
  capability: "code_generate_review_refactor_debug",
  runtimeTask: "code",
  risks: ["ai_cost", "content_generation"],
  actions: [
    { id: "generate", name: "Generate Code", risk: "MEDIUM" },
    { id: "review", name: "Review Code", risk: "LOW" },
    { id: "refactor", name: "Refactor Code", risk: "MEDIUM" },
    { id: "debug", name: "Debug Code", risk: "MEDIUM" },
  ],
};

export const VISION_CONFIG: AICapabilityConfig = {
  id: "ai-vision",
  name: "AI Vision",
  domain: "vision",
  capability: "image_analyze_detect_describe",
  runtimeTask: "classification",
  risks: ["ai_cost", "data_exposure"],
  actions: [
    { id: "analyze_image", name: "Analyze Image", risk: "LOW" },
    { id: "detect_objects", name: "Detect Objects", risk: "LOW" },
    { id: "describe_scene", name: "Describe Scene", risk: "LOW" },
  ],
};

export const VOICE_CONFIG: AICapabilityConfig = {
  id: "ai-voice",
  name: "AI Voice",
  domain: "voice",
  capability: "speech_to_text_text_to_speech_commands",
  runtimeTask: "classification",
  risks: ["ai_cost", "data_exposure"],
  actions: [
    { id: "speech_to_text", name: "Speech to Text", risk: "LOW" },
    { id: "text_to_speech", name: "Text to Speech", risk: "LOW" },
    { id: "voice_command", name: "Voice Command", risk: "MEDIUM" },
  ],
};

export const TRANSLATION_CONFIG: AICapabilityConfig = {
  id: "ai-translation",
  name: "AI Translation",
  domain: "translation",
  capability: "translate_localize_detect_language",
  runtimeTask: "classification",
  risks: ["ai_cost"],
  actions: [
    { id: "translate", name: "Translate", risk: "LOW" },
    { id: "localize", name: "Localize", risk: "MEDIUM" },
    { id: "detect_language", name: "Detect Language", risk: "LOW" },
  ],
};

export const SEARCH_CONFIG: AICapabilityConfig = {
  id: "ai-search",
  name: "AI Search",
  domain: "search",
  capability: "semantic_web_knowledge_search",
  runtimeTask: "research",
  risks: ["ai_cost", "data_exposure"],
  actions: [
    { id: "semantic_search", name: "Semantic Search", risk: "LOW" },
    { id: "web_search", name: "Web Search", risk: "MEDIUM" },
    { id: "knowledge_search", name: "Knowledge Search", risk: "LOW" },
  ],
};

export const MEMORY_CONFIG: AICapabilityConfig = {
  id: "ai-memory",
  name: "AI Memory",
  domain: "memory",
  capability: "store_recall_summarize_context",
  runtimeTask: "research",
  risks: ["ai_cost", "data_exposure"],
  actions: [
    { id: "store", name: "Store Context", risk: "MEDIUM" },
    { id: "recall", name: "Recall Context", risk: "LOW" },
    { id: "summarize_context", name: "Summarize Context", risk: "LOW" },
  ],
};

export const OCR_CONFIG: AICapabilityConfig = {
  id: "ai-ocr",
  name: "AI OCR",
  domain: "ocr",
  capability: "extract_text_from_images_pdfs",
  runtimeTask: "classification",
  risks: ["ai_cost", "data_exposure"],
  actions: [
    { id: "extract_text", name: "Extract Text", risk: "LOW" },
    { id: "extract_from_pdf", name: "Extract from PDF", risk: "MEDIUM" },
  ],
};

export const EMBEDDINGS_CONFIG: AICapabilityConfig = {
  id: "ai-embeddings",
  name: "AI Embeddings",
  domain: "embeddings",
  capability: "generate_compare_index_vectors",
  runtimeTask: "classification",
  risks: ["ai_cost"],
  actions: [
    { id: "generate", name: "Generate Embeddings", risk: "LOW" },
    { id: "compare", name: "Compare Vectors", risk: "LOW" },
    { id: "index_vectors", name: "Index Vectors", risk: "MEDIUM" },
  ],
};

export const RAG_CONFIG: AICapabilityConfig = {
  id: "ai-rag",
  name: "AI RAG",
  domain: "rag",
  capability: "retrieve_augment_generate",
  runtimeTask: "research",
  risks: ["ai_cost", "data_exposure", "content_generation"],
  actions: [
    { id: "retrieve", name: "Retrieve", risk: "LOW" },
    { id: "augment", name: "Augment", risk: "MEDIUM" },
    { id: "generate_with_context", name: "Generate with Context", risk: "MEDIUM" },
  ],
};

export const IMAGES_CONFIG: AICapabilityConfig = {
  id: "ai-images",
  name: "AI Images",
  domain: "images",
  capability: "generate_edit_upscale_variations",
  runtimeTask: "marketing",
  risks: ["ai_cost", "content_generation"],
  actions: [
    { id: "generate", name: "Generate Image", risk: "MEDIUM" },
    { id: "edit", name: "Edit Image", risk: "MEDIUM" },
    { id: "upscale", name: "Upscale Image", risk: "LOW" },
    { id: "variations", name: "Image Variations", risk: "MEDIUM" },
  ],
};

export const VIDEO_CONFIG: AICapabilityConfig = {
  id: "ai-video",
  name: "AI Video",
  domain: "video",
  capability: "analyze_summarize_generate_clips",
  runtimeTask: "classification",
  risks: ["ai_cost", "content_generation"],
  actions: [
    { id: "analyze", name: "Analyze Video", risk: "LOW" },
    { id: "summarize", name: "Summarize Video", risk: "LOW" },
    { id: "generate_clip", name: "Generate Clip", risk: "HIGH" },
  ],
};

export const AUDIO_CONFIG: AICapabilityConfig = {
  id: "ai-audio",
  name: "AI Audio",
  domain: "audio",
  capability: "transcribe_generate_analyze",
  runtimeTask: "classification",
  risks: ["ai_cost", "data_exposure"],
  actions: [
    { id: "transcribe", name: "Transcribe Audio", risk: "LOW" },
    { id: "generate", name: "Generate Audio", risk: "MEDIUM" },
    { id: "analyze", name: "Analyze Audio", risk: "LOW" },
  ],
};

export const ALL_AI_CAPABILITY_CONFIGS: AICapabilityConfig[] = [
  REASONING_CONFIG,
  CODING_CONFIG,
  VISION_CONFIG,
  VOICE_CONFIG,
  TRANSLATION_CONFIG,
  SEARCH_CONFIG,
  MEMORY_CONFIG,
  OCR_CONFIG,
  EMBEDDINGS_CONFIG,
  RAG_CONFIG,
  IMAGES_CONFIG,
  VIDEO_CONFIG,
  AUDIO_CONFIG,
];

export const AI_CAPABILITY_CONFIG_BY_DOMAIN: Record<string, AICapabilityConfig> = Object.fromEntries(
  ALL_AI_CAPABILITY_CONFIGS.map((c) => [c.domain, c])
);
