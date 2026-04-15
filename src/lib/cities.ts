// Add new cities here as Nudge expands. Discover/seed queries filter by active city.
export const CITIES = [
  { slug: "chicago", name: "Chicago", active: true },
  { slug: "new-york", name: "New York", active: false },
  { slug: "san-francisco", name: "San Francisco", active: false },
  { slug: "boston", name: "Boston", active: false },
] as const;

export const DEFAULT_CITY = "Chicago";

export function isCityActive(name: string | null | undefined) {
  if (!name) return false;
  return CITIES.some((c) => c.active && c.name.toLowerCase() === name.toLowerCase());
}
