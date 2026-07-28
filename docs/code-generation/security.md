# Code Security

`lib/code-generation/security/` blocks:

- Real secrets (AWS keys, GitHub tokens, OpenAI keys, live Stripe keys)
- Private keys embedded in code
- Production database connection strings
- Destructive shell commands (`rm -rf /`)
- Dynamic eval()
- ForgeOS internal imports in generated projects
- Force git push
- DROP DATABASE statements

Placeholders like `your-anon-key`, `change-me`, `localhost` are allowed.
