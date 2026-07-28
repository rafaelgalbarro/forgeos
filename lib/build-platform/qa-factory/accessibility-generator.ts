import type { A11yCheckpoint, A11ySpec, QaFactoryInput } from "./types";

export function generateAccessibilityPlan(input: QaFactoryInput): A11ySpec {
  const routes = input.registry.requiredRoutes;

  const checkpoints: A11yCheckpoint[] = [
    {
      id: "a11y-color-contrast",
      wcagCriterion: "1.4.3 Contrast (Minimum)",
      target: "All text and interactive elements",
      tool: "axe-core",
    },
    {
      id: "a11y-keyboard-nav",
      wcagCriterion: "2.1.1 Keyboard",
      target: "Navigation, forms, modals",
      tool: "manual + axe-core",
    },
    {
      id: "a11y-aria-labels",
      wcagCriterion: "4.1.2 Name, Role, Value",
      target: "FHIS components (Button, Status, Badge)",
      tool: "axe-core",
    },
    {
      id: "a11y-focus-order",
      wcagCriterion: "2.4.3 Focus Order",
      target: "Multi-step forms and dashboard panels",
      tool: "manual",
    },
    {
      id: "a11y-screen-reader",
      wcagCriterion: "1.3.1 Info and Relationships",
      target: "Data tables and status indicators",
      tool: "NVDA / VoiceOver",
    },
  ];

  return {
    id: "a11y-main",
    standard: "WCAG 2.1 AA",
    checkpoints,
    scanRoutes: routes,
  };
}
