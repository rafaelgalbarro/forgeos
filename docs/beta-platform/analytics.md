# Analytics

Beta analytics uses console logging and localStorage by default — no external SDK required.

## Events

| Event | Trigger |
|-------|---------|
| `page_view` | Route navigation |
| `waitlist_join` | Waitlist signup |
| `invitation_redeem` | Code redeemed |
| `beta_dashboard_view` | Beta dashboard load |
| `feature_flag_toggle` | Flag changed |
| `feedback_submit` | Feedback sent |
| `crash_report` | Error captured |
| `beta_register` | Account created |
| `cta_click` | CTA interaction |

## Usage

```ts
import { trackBetaEvent, trackBetaPageView, listAnalyticsEvents } from "@/lib/beta-platform";

trackBetaPageView("/beta", userId);

trackBetaEvent({
  event: "cta_click",
  path: "/waitlist",
  label: "join_waitlist",
  userId,
  workspaceId,
});
```

## Storage

- Key: `forgeos-beta-analytics`
- Max events: 500 (FIFO trim)

## Optional POST

When `ENABLE_BETA_ANALYTICS=true` and `BETA_ANALYTICS_ENDPOINT` is set, events are POSTed as JSON. Failures are swallowed (non-blocking).

## UI

`UsageAnalyticsPanel` in Beta Dashboard shows the last 10 events and total count.

## Console

All events log to console with prefix `[ForgeOS Beta Analytics]`.
