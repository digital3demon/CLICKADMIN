/**
 * PM2 для Next.js в режиме `output: "standalone"` (см. next.config.ts).
 * Не используйте `next start` — иначе предупреждение в логах и возможные сбои со статикой.
 *
 * Имя процесса можно переопределить: PM2_APP_NAME=app pm2 start ecosystem.config.cjs
 */
const path = require("path");

const root = __dirname;
const standaloneDir = path.join(root, ".next", "standalone");

module.exports = {
  apps: [
    {
      name: process.env.PM2_APP_NAME || "dental-lab-crm",
      cwd: standaloneDir,
      script: "server.js",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "900M",
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || "3000",
        HOSTNAME: "0.0.0.0",
      },
    },
  ],
};
