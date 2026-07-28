# Accessibility notes

- Status badges use text + color (not color alone); `aria-hidden` on decorative dots.
- Nav uses `aria-current="page"`; `:focus-visible` outline on `.mc-nav-link` / `.mc-link`.
- Loading / empty / error / degraded / permission_denied routed through `RouteStatePanel` + `role="status"` where applicable.
- Header CTA and Studio links are real `<Link>` / buttons with FHIS button classes (keyboard operable).
- Contrast target: WCAG AA-ish on dark surfaces — primary text `#fafafa` on `#111114` / `#16161a`; muted `#a1a1aa` for secondary only.
- Disabled controls remain via existing `.fhis-btn:disabled` opacity (do not remove labels).
