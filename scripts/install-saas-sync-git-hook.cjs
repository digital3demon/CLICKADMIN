/**
 * Устанавливает .git/hooks/post-commit: после commit — npm run sync:saas
 * (Git for Windows запускает sh-скрипты в hooks).
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const gitDir = path.join(ROOT, ".git");
const hookPath = path.join(gitDir, "hooks", "post-commit");

if (!fs.existsSync(gitDir)) {
  console.error("Нет папки .git — инициализируйте репозиторий или пользуйтесь sync:saas:watch.");
  process.exit(1);
}

const hooksDir = path.dirname(hookPath);
if (!fs.existsSync(hooksDir)) {
  fs.mkdirSync(hooksDir, { recursive: true });
}

const body = `#!/bin/sh
# dental-lab-crm: авто-зеркало в dental-crm-saas после коммита
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT" || exit 0
npm run sync:saas --silent 2>/dev/null || true
`;

fs.writeFileSync(hookPath, body.replace(/\r\n/g, "\n"), "utf8");
try {
  fs.chmodSync(hookPath, 0o755);
} catch {
  /* Windows может игнорировать chmod */
}

console.log("Установлен:", hookPath);
console.log("Теперь после каждого «git commit» обновляется зеркало SaaS.");
