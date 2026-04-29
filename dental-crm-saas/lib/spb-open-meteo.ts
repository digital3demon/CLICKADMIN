/** Санкт-Петербург (центр), часовой пояс как в РФ для API. */
export const SPB_LAT = 59.934_28;
export const SPB_LON = 30.335_098;

export type SpbSkyKind = "clear" | "cloudy" | "cloudy_heavy" | "rain" | "snow";

export type SpbSkyPayload = {
  kind: SpbSkyKind;
  cloudCoverPercent: number;
  /** ISO время среза из Open-Meteo */
  observationTime: string | null;
  /** Сервис недоступен — показываем ясное небо без эффектов */
  fallback: boolean;
};

const RAIN_WMO = new Set([
  51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99,
]);

const SNOW_WMO = new Set([71, 73, 75, 77, 85, 86]);

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Интерпретация текущих полей Open-Meteo для декоративных эффектов в UI. */
export function interpretSpbSky(input: {
  weatherCode: number;
  cloudCoverPercent: number;
  rainMm: number;
  showersMm: number;
  snowfallCm: number;
}): Omit<SpbSkyPayload, "observationTime" | "fallback"> {
  const code = input.weatherCode;
  const cloud = Math.max(0, Math.min(100, input.cloudCoverPercent));
  const rainLike = input.rainMm + input.showersMm;

  if (RAIN_WMO.has(code) || rainLike >= 0.08) {
    return { kind: "rain", cloudCoverPercent: cloud };
  }
  if (SNOW_WMO.has(code) || input.snowfallCm >= 0.05) {
    return { kind: "snow", cloudCoverPercent: cloud };
  }
  if (cloud >= 78 || code === 3) {
    return { kind: "cloudy_heavy", cloudCoverPercent: cloud };
  }
  if (cloud >= 38 || code === 2) {
    return { kind: "cloudy", cloudCoverPercent: cloud };
  }
  return { kind: "clear", cloudCoverPercent: cloud };
}

type OpenMeteoCurrent = {
  time?: string;
  weather_code?: number;
  cloud_cover?: number;
  rain?: number;
  showers?: number;
  snowfall?: number;
};

export async function fetchSpbSkyFromOpenMeteo(): Promise<SpbSkyPayload> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(SPB_LAT));
  url.searchParams.set("longitude", String(SPB_LON));
  url.searchParams.set(
    "current",
    "weather_code,cloud_cover,rain,showers,snowfall",
  );
  url.searchParams.set("timezone", "Europe/Moscow");

  const res = await fetch(url.toString(), { next: { revalidate: 600 } });
  if (!res.ok) {
    return {
      kind: "clear",
      cloudCoverPercent: 0,
      observationTime: null,
      fallback: true,
    };
  }

  const data = (await res.json()) as { current?: OpenMeteoCurrent };
  const cur = data.current;
  if (!cur) {
    return {
      kind: "clear",
      cloudCoverPercent: 0,
      observationTime: null,
      fallback: true,
    };
  }

  const interpreted = interpretSpbSky({
    weatherCode: num(cur.weather_code),
    cloudCoverPercent: num(cur.cloud_cover),
    rainMm: num(cur.rain),
    showersMm: num(cur.showers),
    snowfallCm: num(cur.snowfall),
  });

  return {
    ...interpreted,
    observationTime: typeof cur.time === "string" ? cur.time : null,
    fallback: false,
  };
}
