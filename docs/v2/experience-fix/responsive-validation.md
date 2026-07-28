# Responsive validation

| Breakpoint | Behavior |
|------------|----------|
| > 960px | Workspace 2-column: conversation + side panels |
| ≤ 960px | Workspace stacks to single column |
| ≤ 640px | Header padding reduced; nav links compact |

Validated via CSS in `styles/fhis/mission-control.css` (`@media`). Visual smoke after `reset:dev` on `/mission-control` desktop + narrow viewport.
