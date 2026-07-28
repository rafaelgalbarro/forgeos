# Static Validation

PROGRAM 5360 performs **static validation only**.

Results: `STATIC_VALIDATION_PASSED` or `STATIC_VALIDATION_FAILED`.

## Checks

- Empty files
- Duplicate paths
- package.json presence
- README and .env.example
- Import syntax (basic)
- Route file references
- Dependency declarations
- Security scan (secrets, dangerous patterns)
- TypeScript conventions

Compile verification is PROGRAM 5370.
