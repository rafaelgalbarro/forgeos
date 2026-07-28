import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Creator Flow — ForgeOS",
  description:
    "Experiencia continua de creación de startups: Idea → Growth (Epic 7.7)",
};

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
