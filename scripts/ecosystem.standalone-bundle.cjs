/**
 * PM2 для распакованного архива: server.js лежит в корне bundle (рядом с этим файлом).
 */
const path = require("path");

const root = __dirname;

module.exports = {
  apps: [
    {
      name: process.env.PM2_APP_NAME || "dental-lab-crm",
      cwd: root,
      script: path.join(root, "server.js"),
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
