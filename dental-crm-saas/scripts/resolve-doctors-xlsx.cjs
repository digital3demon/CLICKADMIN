/**
 * Единая логика пути к Excel реестра врачей (import + clear-reimport).
 */

const path = require("path");
const fs = require("fs");

const DEFAULT_RELATIVE = path.join("data", "imports", "доктора.xlsx");

function normFileStem(s) {
  return path
    .basename(s, path.extname(s))
    .normalize("NFKC")
    .toLowerCase();
}

function tryAbs(cwd, rel) {
  if (!rel) return null;
  const a = path.isAbsolute(rel) ? rel : path.join(cwd, rel);
  return fs.existsSync(a) ? a : null;
}

/**
 * @param {string} cwd — обычно process.cwd()
 * @param {string | undefined} fileArg — путь из argv, если задан
 * @returns {string} абсолютный путь (может не существовать — проверяйте сами)
 */
function resolveDoctorXlsxAbs(cwd, fileArg) {
  if (fileArg && String(fileArg).trim()) {
    const a = tryAbs(cwd, fileArg);
    if (a) return a;
    return path.isAbsolute(fileArg) ? fileArg : path.join(cwd, fileArg);
  }

  const fromEnv = tryAbs(cwd, process.env.DOCTORS_IMPORT_XLSX);
  if (fromEnv) return fromEnv;

  const direct = tryAbs(cwd, DEFAULT_RELATIVE);
  if (direct) return direct;

  const dir = path.join(cwd, "data", "imports");
  if (!fs.existsSync(dir)) {
    return path.join(cwd, DEFAULT_RELATIVE);
  }
  const names = fs
    .readdirSync(dir)
    .filter((f) => /\.xlsx$/i.test(f) && !/^~\$/.test(f));
  const skip = new Set(["1.xlsx"]);
  const candidates = names.filter((f) => !skip.has(f.toLowerCase()));
  const byHint = candidates.find((f) => {
    const n = normFileStem(f);
    return n.includes("врач") || n.includes("докт") || /doctor/i.test(f);
  });
  if (byHint) return path.join(dir, byHint);
  return path.join(cwd, DEFAULT_RELATIVE);
}

function formatMissingHelp(absExpected) {
  const dir = path.join(process.cwd(), "data", "imports");
  let listing = "";
  if (fs.existsSync(dir)) {
    const names = fs
      .readdirSync(dir)
      .filter((f) => /\.xlsx$/i.test(f));
    listing =
      names.length > 0
        ? `\n  Сейчас в data/imports: ${names.join(", ")}`
        : "\n  В data/imports нет .xlsx.";
  }
  return `Файл не найден: ${absExpected}
  Задайте DOCTORS_IMPORT_XLSX, положите реестр в data/imports/доктора.xlsx
  или передайте путь аргументом.${listing}`;
}

module.exports = {
  DEFAULT_RELATIVE,
  resolveDoctorXlsxAbs,
  formatMissingHelp,
};
