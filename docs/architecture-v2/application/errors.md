# Errors (Program 6020)

```ts
ApplicationError {
  code: string;
  message: string;
  category: "validation" | "authorization" | "not_found" | "conflict"
    | "invalid_transition" | "idempotency" | "infrastructure"
    | "transaction" | "unknown";
  retryable: boolean;
  fieldErrors?: Record<string, string>;
  correlationId?: string;
}
```

Buses return `{ ok: false, error }` — never stack traces or secrets to UI.
`ApplicationFailure` is the internal throw type; `toApplicationError` sanitizes unknowns.
