# Waitlist

## Join flow

Users submit name and email via `WaitlistForm` on `/waitlist`, `/beta`, or `/support`.

```ts
import { joinWaitlist, getQueuePosition } from "@/lib/beta-platform";

const entry = joinWaitlist({ email, name, company, useCase });
// entry.queuePosition — auto-incremented counter in localStorage
```

## Storage

- Key: `forgeos-beta-waitlist`
- Queue counter: `forgeos-beta-queue-counter` (starts at 100)

## Status progression

| Status | Meaning |
|--------|---------|
| `pending` | On waitlist, no invitation |
| `invited` | Invitation code redeemed |
| `registered` | Auth account created |
| `active` | Full beta access |

## Queue estimate

`estimateWaitDays(position)` returns a demo heuristic: `ceil(position / 50)` days minimum 1.

## No real email

Waitlist does not send emails. Invitation codes are demo tokens for local development.
