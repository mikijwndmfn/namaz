import type { Location } from "../lib/types";

export const LOCATIONS: Location[] = [
  { id: "nuernberg", name: "Nürnberg, Almanya", lat: 49.4521, lon: 11.0767, tz: "Europe/Berlin", hasDiyanet: true },
  { id: "fuerth", name: "Fürth, Almanya", lat: 49.4771, lon: 10.9887, tz: "Europe/Berlin", hasDiyanet: true },
  { id: "istanbul", name: "İstanbul, Türkiye", lat: 41.0082, lon: 28.9784, tz: "Europe/Istanbul", hasDiyanet: true },
];

export const HOME_LOCATION_ID = "nuernberg";

export function findLocation(id: string | null | undefined): Location {
  return LOCATIONS.find((l) => l.id === id) ?? LOCATIONS[0];
}
