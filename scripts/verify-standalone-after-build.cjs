/**
 * После `next build` с output: "standalone" должен появиться `.next/standalone/server.js`.
 * Если его нет — команда `node server.js` на сервере не заработает (типичная путаница в поддержке PaaS).
 */
const fs = require("fs");
const path = require("path");

const root = path.join(process.cwd(), ".next", "standalone", "server.js");
if (!fs.existsSync(root)) {
  console.error(
    "[verify-standalone] Нет файла:",
    root,
    "\nПроверьте, что next.config подхватил output: \"standalone\" и сборка шла из корня репозитория.",
  );
  process.exit(1);
}
console.log("[verify-standalone] OK:", root);
