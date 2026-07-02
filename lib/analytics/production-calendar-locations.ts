import locationsJson from "@/data/production-calendar-locations.ru.json";
import {
  PRODUCTION_CALENDAR_COUNTRIES,
  type ProductionCalendarCountry,
} from "@/lib/production-calendar";

export type ProductionCalendarLocation = {
  id: string;
  country: ProductionCalendarCountry;
  label: string;
  searchAliases: string[];
  timezone: string;
  extraHolidaysMmDd: string[];
};

const LOCATIONS: ProductionCalendarLocation[] = (
  locationsJson as ProductionCalendarLocation[]
).filter((row) =>
  PRODUCTION_CALENDAR_COUNTRIES.includes(row.country as ProductionCalendarCountry),
);

const BY_ID = new Map(LOCATIONS.map((row) => [row.id, row]));

export function listProductionCalendarLocations(): ProductionCalendarLocation[] {
  return LOCATIONS.slice();
}

export function getProductionCalendarLocation(
  id: string | null | undefined,
): ProductionCalendarLocation | null {
  const key = String(id ?? "").trim();
  if (!key) return null;
  return BY_ID.get(key) ?? null;
}

function normalizeSearch(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function searchProductionCalendarLocations(
  query: string,
  limit = 20,
): ProductionCalendarLocation[] {
  const q = normalizeSearch(query);
  if (!q) return LOCATIONS.slice(0, limit);
  const out: ProductionCalendarLocation[] = [];
  for (const row of LOCATIONS) {
    const hay = normalizeSearch(
      [row.label, row.id, ...row.searchAliases].join(" "),
    );
    if (hay.includes(q) || row.searchAliases.some((a) => normalizeSearch(a).startsWith(q))) {
      out.push(row);
      if (out.length >= limit) break;
    }
  }
  return out;
}
