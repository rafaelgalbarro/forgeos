# Capability Resolver

The resolver **never** requires manual skill/provider selection. It auto-resolves:

- Primary skill (from compatible pool or preferred if valid)
- Provider (ranked by priority map)
- Policy (category + risk overrides)
- Approval (CEO / legal for critical)
- Fallback skill IDs
- Sandbox mode (always true in RC4.9)

## Example: deploy_software

```ts
resolveCapability({
  capabilityId: "deploy_software",
  context: {
    ventureId: "demo-venture",
    requestedBy: "deployment",
    approvedBy: "ceo",
    action: "deploy_preview",
  },
});
// → primarySkillId: "github", provider: "github", policy: cap-policy-development-deploy_software
```

## Fallback chain

Skill fallbacks are merged from a static map and registry compatible skills (e.g. github → gitlab, bitbucket).
