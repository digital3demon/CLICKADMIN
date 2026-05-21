const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
function run(script) {
  const fullPath = path.join(root, "scripts", script);
  if (!fs.existsSync(fullPath)) {
    console.warn(`[mail-rules] ${script} не найден, пропускаю.`);
    return 0;
  }
  const result = spawnSync(process.execPath, [fullPath], {
    cwd: root,
    stdio: "inherit",
    shell: false,
    env: {
      ...process.env,
      MAIL_RULES_ORDER_SKIP_MISSING: process.env.MAIL_RULES_ORDER_SKIP_MISSING || "1",
    },
  });
  return result.status === null ? 1 : result.status;
}

const importStatus = run("import-order-digitaldemon-mail-rules.cjs");
if (importStatus !== 0) process.exit(importStatus);

if (process.env.MAIL_RULES_ORDER_APPLY_ON_DEPLOY !== "1") {
  console.warn(
    "[mail-rules] обратное применение правил по всем письмам пропущено. Для разового запуска задайте MAIL_RULES_ORDER_APPLY_ON_DEPLOY=1.",
  );
  process.exit(0);
}

const applyStatus = run("apply-order-digitaldemon-mail-rules.cjs");
if (applyStatus !== 0) process.exit(applyStatus);

