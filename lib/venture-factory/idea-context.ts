/** Venture Factory — vertical detection & shared helpers */

export interface IdeaProfile {
  ideaText: string;
  vertical: string;
  isPremiumGlasses: boolean;
  isSaaS: boolean;
}

const GLASSES_PATTERN = /gafas|óptica|optica|eyewear|lentes|premium/i;
const SAAS_PATTERN = /saas|plataforma|software|app|dashboard/i;

export function parseIdeaProfile(command: string): IdeaProfile {
  const ideaText = command.trim();
  const isPremiumGlasses = GLASSES_PATTERN.test(ideaText);
  const isSaaS = SAAS_PATTERN.test(ideaText);

  let vertical = "general";
  if (isPremiumGlasses) vertical = "premium_eyewear";
  else if (isSaaS) vertical = "saas_b2b";
  else if (/e-?commerce|tienda|retail/i.test(ideaText)) vertical = "ecommerce";

  return { ideaText, vertical, isPremiumGlasses, isSaaS };
}

export function defaultCompanyName(profile: IdeaProfile): string {
  if (profile.isPremiumGlasses) return "Lumière Optics";
  if (profile.isSaaS) return "NovaStack";
  if (profile.vertical === "ecommerce") return "Mercato Studio";
  const words = profile.ideaText.split(/\s+/).filter((w) => w.length > 3).slice(0, 2);
  return words.length ? `${capitalize(words[0])}${words[1] ? ` ${capitalize(words[1])}` : ""}` : "Forge Venture";
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
