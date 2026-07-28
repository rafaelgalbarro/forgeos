import clsx, { type ClassValue } from "clsx";

/** FHIS className merger — thin clsx wrapper */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
