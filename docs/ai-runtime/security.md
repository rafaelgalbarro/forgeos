# Security (RC6)

## Principles

1. API keys never exposed to client or user output
2. Chain-of-thought never returned to users — executive summaries only
3. Sensitive prompts sanitized before logging
4. All AI calls flow through the runtime pipeline (no direct provider calls from business modules)

## Built-in Policies

Prompt Compiler v2 injects security constraints on every call.

## Executive Reasoning

Internal deliberation is stripped via `toExecutiveSummary()` before user exposure.
