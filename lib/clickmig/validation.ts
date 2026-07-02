import type { ClickMigConfigJson, ClickMigApplicationInput, ClickMigValidationResult } from "./types";

function hasScans(input: ClickMigApplicationInput, scanFileCount: number): boolean {
  const links = input.scanLinks?.filter(Boolean) ?? [];
  return scanFileCount > 0 || links.length > 0;
}

function hasPhotos(input: ClickMigApplicationInput, photoFileCount: number): boolean {
  const links = input.photoLinks?.filter(Boolean) ?? [];
  return photoFileCount > 0 || links.length > 0;
}

function constructionRequiresScanbody(
  config: ClickMigConfigJson,
  key: string,
): boolean {
  const ct = config.constructionTypes.find((c) => c.key === key);
  return ct?.requiresScanbody === true || inputScrewRetained(key, config);
}

function inputScrewRetained(key: string, config: ClickMigConfigJson): boolean {
  if (key === "screw_retained") return true;
  const ct = config.constructionTypes.find((c) => c.key === key);
  return ct?.requiresScanbody === true;
}

export function validateClickMigApplication(
  config: ClickMigConfigJson,
  input: ClickMigApplicationInput,
  opts: { photoFileCount?: number; scanFileCount?: number } = {},
): ClickMigValidationResult {
  const photoFileCount = opts.photoFileCount ?? 0;
  const scanFileCount = opts.scanFileCount ?? 0;
  const needsScanbody =
    input.screwRetained === true ||
    constructionRequiresScanbody(config, input.constructionTypeKey);

  const filledByField: Record<string, boolean> = {
    patientName: input.patientName.trim().length > 0,
    doctorName: input.doctorName.trim().length > 0,
    doctorEmail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.doctorEmail.trim()),
    constructionTypeKey: config.constructionTypes.some(
      (c) => c.key === input.constructionTypeKey,
    ),
    material: Boolean(input.material),
    teethFdi: input.teethFdi.length > 0,
    scans: hasScans(input, scanFileCount),
    photos: hasPhotos(input, photoFileCount),
    shadeCode: Boolean(input.shadeCode?.trim()),
    scanbodyManufacturer: !needsScanbody || Boolean(input.scanbodyManufacturer?.trim()),
  };

  const hints = config.validationHints.map((h) => {
    let required = h.required;
    if (h.field === "scanbodyManufacturer") {
      required = needsScanbody;
    }
    if (h.field === "photos") {
      required = false;
    }
    return {
      ...h,
      required,
      filled: filledByField[h.field] ?? true,
    };
  });

  const valid = hints.every((h) => !h.required || h.filled);

  return { valid, hints };
}
