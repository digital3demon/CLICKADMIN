const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const schemaPath = process.argv[2];
if (!schemaPath) {
  console.error("Usage: node scripts/prisma-migrate-domain.cjs <schema-path>");
  process.exit(1);
}

const root = path.join(__dirname, "..");
const vf = path.join(root, ".prisma-cli-version");
const prismaVersion = fs.existsSync(vf) ? fs.readFileSync(vf, "utf8").trim() : "6.19.3";
const prismaSpec = `prisma@${prismaVersion}`;
const isWin = process.platform === "win32";

const migrate = spawnSync(
  "npx",
  ["-y", prismaSpec, "migrate", "deploy", `--schema=${schemaPath}`],
  { cwd: root, stdio: "inherit", shell: isWin, env: process.env },
);
if (migrate.status !== 0) process.exit(migrate.status || 1);

const gen = spawnSync(
  "npx",
  ["-y", prismaSpec, "generate", `--schema=${schemaPath}`],
  { cwd: root, stdio: "inherit", shell: isWin, env: process.env },
);
process.exit(gen.status || 0);

