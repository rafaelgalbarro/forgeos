# Conversation Engine

Location: `lib/mission-control/conversation-engine.ts`

## Rules

1. **One decision per response** — never ask two questions at once
2. **Brief Spanish CEO voice** — human tone, no jargon walls
3. **Card or text** — same pipeline via `intention-engine`
4. **No forms** — discovery mode uses conversational questions only

## Entry points

- `processConversationTurn(mission, input, cardId?)` — main handler
- `handleCardSelection()` — 5 intention cards
- `handleUserMessage()` — free text + decision resolution
- `resolveDecisionById()` — Decision Center checkbox resolve

## Discovery mode

When `DISCOVERY` intention:

1. CEO asks profile questions (knowledge, capital, time, goals, market, interests)
2. Generates top 3 opportunities with Venture Score
3. User picks 1–3 → auto-continues into VENTURE flow

## Simulated progression

When real AI is not invoked, `live-execution.ts` advances steps on a timer and `mission-flow.ts` updates snapshot progress heuristically.
