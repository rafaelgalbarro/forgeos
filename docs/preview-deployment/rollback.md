# Rollback

Rollback steps (documented in every deployment request):

1. Cancel in-flight deployment
2. Deactivate Vercel preview deployment
3. Revert last commit on preview branch if pushed
4. Restore Supabase sandbox snapshot if configured
5. Mark deployment `ROLLED_BACK` in audit log

Triggered via **Rollback** button in Output Studio or API `POST /api/preview-deployment/rollback`.

Sandbox cleanup is optional and disabled by default (`cleanupSandbox: false`).
