/**
 * PM2 для VPS / архива, не для Timeweb App Platform.
 * В корне репозитория файла нет: платформа иначе делает `npm install -g pm2`
 * и падает на сети к registry.
 *
 *   pm2 start scripts/ecosystem.config.cjs
 *   PM2_APP_NAME=app pm2 start scripts/ecosystem.config.cjs
 *
 * Timeweb / Docker: `npm start` → node server.js, или `npm run start:platform`.
 */
const path = require("path");

const root = path.join(__dirname, "..");
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
