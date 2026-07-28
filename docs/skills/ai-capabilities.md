# AI Capability Skills (RC4.7)

ForgeOS AI skills are **capabilities**, not model bindings. Each capability domain (reasoning, coding, vision, etc.) exposes governed actions that execute in **sandbox mode** only.

## Architecture

- **No direct vendor API calls** — OpenAI, Anthropic, and other providers are never invoked from skill modules.
- **AI Runtime routing** — all execution flows through `runAIRuntime` / `completeViaAIRuntime` (`lib/ai-runtime/pipeline.ts`).
- **Skills Governance** — every request passes `runGovernedSkillRequest` with `ai_usage` policy enforcement.
- **Runtime adapter** — `dispatchSkillToRuntime` records planned execution in the ForgeOS runtime.

## Capability Domains (13)

| Domain | Skill ID | Actions |
|--------|----------|---------|
| Reasoning | `ai-reasoning` | chain_of_thought, analyze, plan |
| Coding | `ai-coding` | generate, review, refactor, debug |
| Vision | `ai-vision` | analyze_image, detect_objects, describe_scene |
| Voice | `ai-voice` | speech_to_text, text_to_speech, voice_command |
| Translation | `ai-translation` | translate, localize, detect_language |
| Search | `ai-search` | semantic_search, web_search, knowledge_search |
| Memory | `ai-memory` | store, recall, summarize_context |
| OCR | `ai-ocr` | extract_text, extract_from_pdf |
| Embeddings | `ai-embeddings` | generate, compare, index_vectors |
| RAG | `ai-rag` | retrieve, augment, generate_with_context |
| Images | `ai-images` | generate, edit, upscale, variations |
| Video | `ai-video` | analyze, summarize, generate_clip |
| Audio | `ai-audio` | transcribe, generate, analyze |

## Lab

Open `/lab/ai-skills` to inspect registry, mock outputs, runtime routing, telemetry, and audit history.

## Module Structure

Each domain under `lib/skills/ai/<domain>/` includes: `types`, `registry`, `permissions`, `policies`, `risk`, `rollback`, `mock-executor`, `sandbox`, `adapter`, `index`.
