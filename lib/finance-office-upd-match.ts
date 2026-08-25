/**
 * Пул УПД → строки счетов: отпечаток, затем ручной номер.
 * Один ключ УПД не назначается двум строкам как единственный.
 */

import { normalizeUpdDigitsInput } from "@/lib/extract-upd-number";
import {
  fingerprintsMatch,
  type DocFingerprint,
} from "@/lib/finance-office-doc-fingerprint";

export type UpdPoolItem = {
  key: string;
  number: string;
  fileName: string;
  fingerprint: DocFingerprint;
};

export type UpdAssignment = {
  keys: string[];
  match: "none" | "one" | "many";
};

export function findUpdsByNumber(
  pool: readonly UpdPoolItem[],
  rawNumber: string,
): UpdPoolItem[] {
  const want = normalizeUpdDigitsInput(rawNumber);
  if (!want) return [];
  return pool.filter((p) => normalizeUpdDigitsInput(p.number) === want);
}

export function assignUpdsByFingerprint(
  invoiceFingerprints: ReadonlyMap<string, DocFingerprint>,
  pool: readonly UpdPoolItem[],
): Map<string, string[]> {
  const invKeys = [...invoiceFingerprints.keys()];
  const matches = new Map<string, string[]>();
  for (const ik of invKeys) matches.set(ik, []);

  for (const upd of pool) {
    const hits = invKeys.filter((ik) => {
      const fp = invoiceFingerprints.get(ik);
      return fp ? fingerprintsMatch(fp, upd.fingerprint) : false;
    });
    if (hits.length === 1) {
      matches.get(hits[0]!)!.push(upd.key);
    } else if (hits.length > 1) {
      for (const ik of hits) matches.get(ik)!.push(upd.key);
    }
  }
  return matches;
}

export function assignmentFromKeys(keys: readonly string[]): UpdAssignment {
  const unique = [...new Set(keys.filter(Boolean))];
  if (unique.length === 0) return { keys: [], match: "none" };
  if (unique.length === 1) return { keys: unique, match: "one" };
  return { keys: unique, match: "many" };
}

export function applyManualUpdNumber(
  pool: readonly UpdPoolItem[],
  rawNumber: string,
): UpdAssignment {
  return assignmentFromKeys(findUpdsByNumber(pool, rawNumber).map((p) => p.key));
}

export function takeUpdOffRow(keys: readonly string[], removeKey: string): string[] {
  return keys.filter((k) => k !== removeKey);
}
