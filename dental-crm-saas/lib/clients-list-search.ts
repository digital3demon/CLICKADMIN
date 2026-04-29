import type { BillingLegalForm } from "@prisma/client";

/** Нормализация строки поиска (пусто = не фильтровать). */
export function normalizeClientsSearchQuery(raw: string | undefined): string {
  return (raw ?? "").trim();
}

function billingLegalFormSearchBits(
  form: BillingLegalForm | null | undefined,
): string[] {
  if (form == null) return [];
  if (form === "OOO") return ["ООО", "OOO", "ooo"];
  if (form === "IP") return ["ИП", "IP", "ип", "ip"];
  return [];
}

export const CLIENTS_PAGE_SIZE = 15;

export type ClinicSortKey = "name" | "doctors" | "orders" | "turnover";

export type ClientsListUrlState = {
  view: "clinic" | "doctor";
  clinicQ: string;
  doctorQ: string;
  clinicSort: ClinicSortKey;
  clinicDir: "asc" | "desc";
  clinicPage: number;
  doctorPage: number;
};

function firstQuery(
  v: string | string[] | undefined,
): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export function parseClinicSort(v: string | undefined | null): ClinicSortKey {
  if (v === "doctors" || v === "orders" || v === "turnover") return v;
  return "name";
}

export function parseClinicDir(
  sort: ClinicSortKey,
  v: string | undefined | null,
): "asc" | "desc" {
  if (v === "asc" || v === "desc") return v;
  return sort === "name" ? "asc" : "desc";
}

export function clampClientsPage(v: string | undefined | null): number {
  const n = parseInt(String(v ?? "1"), 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

/** Разбор query из серверного page (Next searchParams). */
export function parseClientsListUrlQuery(
  query: Record<string, string | string[] | undefined>,
): ClientsListUrlState {
  const view =
    firstQuery(query.view) === "doctor" ? "doctor" : "clinic";
  const clinicQ = normalizeClientsSearchQuery(firstQuery(query.clinicQ));
  const doctorQ = normalizeClientsSearchQuery(firstQuery(query.doctorQ));
  const clinicSort = parseClinicSort(firstQuery(query.clinicSort) ?? null);
  const clinicDir = parseClinicDir(
    clinicSort,
    firstQuery(query.clinicDir) ?? null,
  );
  return {
    view,
    clinicQ,
    doctorQ,
    clinicSort,
    clinicDir,
    clinicPage: clampClientsPage(firstQuery(query.clinicPage) ?? null),
    doctorPage: clampClientsPage(firstQuery(query.doctorPage) ?? null),
  };
}

/** Клиент: разбор из useSearchParams (все ключи строки или null). */
export function clientsListStateFromSearchParams(
  sp: { get: (k: string) => string | null },
  viewFallback: "clinic" | "doctor",
): ClientsListUrlState {
  const v = sp.get("view");
  const view = v === "doctor" ? "doctor" : v === "clinic" ? "clinic" : viewFallback;
  const clinicSort = parseClinicSort(sp.get("clinicSort"));
  const clinicDir = parseClinicDir(clinicSort, sp.get("clinicDir"));
  return {
    view,
    clinicQ: sp.get("clinicQ") ?? "",
    doctorQ: sp.get("doctorQ") ?? "",
    clinicSort,
    clinicDir,
    clinicPage: clampClientsPage(sp.get("clinicPage")),
    doctorPage: clampClientsPage(sp.get("doctorPage")),
  };
}

/** Сборка URL списка клиентов (поиск, сортировка клиник, страницы). */
export function buildClientsListUrl(s: ClientsListUrlState): string {
  const p = new URLSearchParams();
  p.set("view", s.view);
  if (s.clinicQ.trim()) p.set("clinicQ", s.clinicQ.trim());
  if (s.doctorQ.trim()) p.set("doctorQ", s.doctorQ.trim());
  if (s.clinicSort !== "name" || s.clinicDir !== "asc") {
    p.set("clinicSort", s.clinicSort);
    p.set("clinicDir", s.clinicDir);
  }
  if (s.clinicPage > 1) p.set("clinicPage", String(s.clinicPage));
  if (s.doctorPage > 1) p.set("doctorPage", String(s.doctorPage));
  return `/clients?${p.toString()}`;
}

/** Значение `<option>` для связки поле + направление. */
export function clinicOrderSelectValue(
  sort: ClinicSortKey,
  dir: "asc" | "desc",
): string {
  return `${sort}:${dir}`;
}

export function parseClinicOrderSelectValue(
  raw: string,
): { clinicSort: ClinicSortKey; clinicDir: "asc" | "desc" } | null {
  const m = /^(name|doctors|orders|turnover):(asc|desc)$/.exec(raw.trim());
  if (!m) return null;
  return {
    clinicSort: m[1] as ClinicSortKey,
    clinicDir: m[2] as "asc" | "desc",
  };
}

export const CLINIC_ORDER_OPTIONS: { value: string; label: string }[] = [
  { value: "name:asc", label: "По названию (А → Я)" },
  { value: "name:desc", label: "По названию (Я → А)" },
  { value: "doctors:desc", label: "По числу врачей (сначала больше)" },
  { value: "doctors:asc", label: "По числу врачей (сначала меньше)" },
  { value: "orders:desc", label: "По числу заказов (сначала больше)" },
  { value: "orders:asc", label: "По числу заказов (сначала меньше)" },
  { value: "turnover:desc", label: "По обороту (сначала больше)" },
  { value: "turnover:asc", label: "По обороту (сначала меньше)" },
];

export function clinicMatchesSearch(
  c: {
    name: string;
    address: string | null;
    legalFullName: string | null;
    billingLegalForm?: BillingLegalForm | null;
    email: string | null;
    phone: string | null;
    inn: string | null;
    ceoName: string | null;
  },
  needle: string,
): boolean {
  const n = normalizeClientsSearchQuery(needle).toLowerCase();
  if (!n) return true;
  const hay = [
    c.name,
    c.address,
    c.legalFullName,
    ...billingLegalFormSearchBits(c.billingLegalForm),
    c.email,
    c.phone,
    c.inn,
    c.ceoName,
  ]
    .filter((x) => x != null && String(x).trim() !== "")
    .join("\n")
    .toLowerCase();
  return hay.includes(n);
}

export function doctorMatchesSearch(
  d: {
    fullName: string;
    lastName: string | null;
    firstName: string | null;
    patronymic: string | null;
    formerLastName: string | null;
    specialty: string | null;
    city: string | null;
    email: string | null;
    clinicWorkEmail: string | null;
    phone: string | null;
    preferredContact: string | null;
    telegramUsername: string | null;
    particulars: string | null;
    clinicLinks: {
      clinic: {
        name: string;
        legalFullName?: string | null;
        billingLegalForm?: BillingLegalForm | null;
      };
    }[];
  },
  needle: string,
): boolean {
  const n = normalizeClientsSearchQuery(needle).toLowerCase();
  if (!n) return true;
  const clinics = d.clinicLinks
    .flatMap((l) => {
      const c = l.clinic;
      const bits = [c.name, c.legalFullName, ...billingLegalFormSearchBits(c.billingLegalForm)];
      return bits.filter((x) => x != null && String(x).trim() !== "");
    })
    .join("\n");
  const hay = [
    d.fullName,
    d.lastName,
    d.firstName,
    d.patronymic,
    d.formerLastName,
    d.specialty,
    d.city,
    d.email,
    d.clinicWorkEmail,
    d.phone,
    d.preferredContact,
    d.telegramUsername,
    d.particulars,
    clinics,
  ]
    .filter((x) => x != null && String(x).trim() !== "")
    .join("\n")
    .toLowerCase();
  return hay.includes(n);
}
