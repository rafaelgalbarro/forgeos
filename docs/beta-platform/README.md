# Private Beta Platform — Sprint 6

Program 3000 Sprint 6 prepares ForgeOS for private beta with waitlist, invitations, feedback, analytics, feature flags, and a beta dashboard.

## Architecture

```
lib/beta-platform/
├── types.ts           # Shared types
├── config.ts          # Env flags (BETA_MODE, analytics, crashes)
├── waitlist.ts        # Join waitlist, queue position
├── invitations.ts     # Invite codes, redeem
├── feedback.ts        # User feedback submissions
├── analytics.ts       # Usage events (localStorage + optional POST)
├── crash-reports.ts   # Client error capture stub
├── feature-flags.ts   # Beta flags per user/workspace
├── changelog.ts       # Public changelog (extends lib/launch)
├── beta-dashboard.ts  # Dashboard data aggregator
└── index.ts

components/beta-platform/
├── BetaDashboard.tsx
├── WaitlistForm.tsx / WaitlistPage.tsx
├── InvitationRedeem.tsx
├── FeedbackForm.tsx / FeedbackPage.tsx
├── FeatureFlagsPanel.tsx
├── UsageAnalyticsPanel.tsx
├── CrashReportsPanel.tsx
├── ChangelogPanel.tsx
└── SupportHub.tsx
```

## Routes

| Route | Purpose |
|-------|---------|
| `/beta` | Beta Dashboard — main hub |
| `/waitlist` | Waitlist signup |
| `/feedback` | Feedback form |
| `/status` | System status (enhanced) |
| `/support` | Support center (enhanced) |
| `/landing` | Public landing (RC12) |

## Beta access flow

1. **Waitlist** — User joins at `/waitlist` or `/beta` → `joinWaitlist()` stores entry with queue position
2. **Invitation** — User redeems code (demo: `FORGE-BETA-2026`) → `redeemInvitation()`
3. **Register** — User creates account via Sprint 1 auth at `/register`
4. **Active** — Full product access at `/os`

Legacy RC12 `lib/launch/beta-signup` remains compatible for existing users.

## Auth integration

- `resolveBetaAccess()` checks waitlist, invitation, and `readSession()` from Sprint 1
- Feature flags scoped via `userId` and `activeWorkspaceId` from auth session

## Environment

See `.env.example`:

- `BETA_MODE=true`
- `ENABLE_BETA_ANALYTICS=true`
- `ENABLE_CRASH_REPORTS=true`

## FHIS

All UI uses FHIS components (`Container`, `Panel`, `Badge`, `SectionHeader`, etc.) and `styles/fhis/components.css` beta classes.
