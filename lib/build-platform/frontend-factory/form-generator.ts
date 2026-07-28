import type { FormSpec, FrontendFactoryInput } from "./types";

export function generateFormPlan(input: FrontendFactoryInput): FormSpec[] {
  return [
    {
      id: "form-onboarding",
      title: "Onboarding Form",
      submitIntent: "Capture user profile and setup preferences.",
      fields: [
        { id: "company-name", label: "Company Name", type: "text", required: true, sourceSection: "users" },
        { id: "role", label: "Role", type: "select", required: true, sourceSection: "personas" },
        { id: "team-size", label: "Team Size", type: "number", required: false, sourceSection: "businessModel" },
      ],
      components: ["cmp-page-panel", "cmp-primary-action"],
    },
    {
      id: "form-feedback",
      title: "Feedback Form",
      submitIntent: `Collect product feedback for ${input.context.meta.ventureName}.`,
      fields: [
        { id: "topic", label: "Topic", type: "select", required: true, sourceSection: "productPrd" },
        { id: "comment", label: "Comment", type: "textarea", required: true, sourceSection: "qa" },
        { id: "contact-me", label: "Contact me", type: "switch", required: false },
      ],
      components: ["cmp-page-panel", "cmp-primary-action"],
    },
  ];
}
