/** JSON-safe сериализация Prisma-строк: Date → ISO, BigInt → string, Bytes → omit. */

const BYTES_KEY_HINT =
  /^(data|docxData|avatarCustomData|xlsxBytes|invoiceFileBytes|fileData)$/i;

export function crmDumpJsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return undefined;
  if (value instanceof Uint8Array) return undefined;
  return value;
}

/** Убрать бинарные поля и чувствительные ключи тенанта/почты перед записью в дамп. */
export function scrubRowForDump(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (BYTES_KEY_HINT.test(k)) continue;
    if (v instanceof Date) {
      out[k] = v.toISOString();
      continue;
    }
    if (Buffer.isBuffer(v) || v instanceof Uint8Array) continue;
    if (typeof v === "bigint") {
      out[k] = v.toString();
      continue;
    }
    out[k] = v;
  }
  return out;
}

export function scrubRowsForDump(
  rows: Record<string, unknown>[],
): Record<string, unknown>[] {
  return rows.map((r) => scrubRowForDump(r));
}
