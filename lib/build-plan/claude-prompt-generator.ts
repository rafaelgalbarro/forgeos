import type { PromptContext } from "./prompt-context";

export function generateClaudePrompt(ctx: PromptContext): string {
  return `I need you to act as my technical cofounder and help me build the MVP for "${ctx.ventureName}".

## Context
This venture was analyzed and structured by ForgeOS. Use the sections below as source of truth. **Discovery Context** reflects explicit user decisions and has priority over generic heuristics.

## Idea
${ctx.ideaText}

${ctx.prdBlock}

${ctx.researchBlock}

---
## Discovery Context (user decisions — priority)
${ctx.discoveryBlock}

${ctx.simulatorBlock}

---
## Technical direction
${ctx.stackSummary}

## MVP scope
${ctx.mvpScope}

## Screens
${ctx.screens}

## Core flows
${ctx.coreFlows}

## Suggested build sequence
${ctx.implementationOrder}

---
## ForgeOS Brain Context
${ctx.brainBlock}

## What I need from you
1. Validate the technical approach for this MVP (call out risks early).
2. Propose a minimal architecture diagram in text (components + data flow).
3. Generate production-ready code incrementally — start with schema + auth + one complete user journey.
4. Flag anything marked "hipótesis" or "por validar" — do not invent verified market data.
5. Keep scope small: 4-8 weeks, one developer.

## Constraints
- TypeScript preferred for web apps.
- Avoid premature optimization and unnecessary abstractions.
- If payments are in scope, use Stripe with webhooks; plan for disputes later.
- End each response with the next 3 concrete implementation tasks.

Start by summarizing what you understood and your recommended first sprint.`;
}
