/**
 * Liveness без curl/apt: Timeweb/Debian-репозитории на сборке часто недоступны.
 * Проверяет процесс, не БД (`/api/health/live`).
 */
const port = String(process.env.PORT || "3000").trim() || "3000";
const req = require("node:http").get(
  `http://127.0.0.1:${port}/api/health/live`,
  (res) => {
    res.resume();
    process.exit(res.statusCode === 200 ? 0 : 1);
  },
);
req.on("error", () => process.exit(1));
req.setTimeout(4000, () => {
  req.destroy();
  process.exit(1);
});
