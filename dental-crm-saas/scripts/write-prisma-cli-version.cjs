/**
 * Prints prisma version from package-lock.json (for: npx prisma@VERSION migrate deploy).
 */
const path = require("path");
const lock = require(path.join(__dirname, "..", "package-lock.json"));
const v = lock.packages?.["node_modules/prisma"]?.version;
if (!v) {
  console.error("Cannot read prisma version from package-lock.json");
  process.exit(1);
}
process.stdout.write(v.trim());
