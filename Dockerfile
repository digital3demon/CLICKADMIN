# Timeweb Cloud Apps / Docker.
# Сборка часто без доступа к deb.debian.org — не вызывать apt-get.
# Не добавляйте `RUN npm install -g pm2` — registry.npmjs.org часто даёт ETIMEDOUT.
# bookworm (не slim): openssl/ca-certificates уже в образе, Prisma не требует apt.

FROM node:22-bookworm AS builder

WORKDIR /app

# Свежий npm в образе — меньше «Exit handler never called!» на npm ci.
RUN npm install -g npm@11.6.2

COPY package.json package-lock.json .npmrc ./
# Повтор при флапе реестра / внутреннем сбое npm.
RUN npm ci --no-audit --no-fund \
  || (npm cache clean --force && npm ci --no-audit --no-fund)

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# generate из локального prisma (npm ci), без npx и binaries.prisma.sh
# migrate — на старте контейнера
RUN npm run build:platform

FROM node:22-bookworm AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server.js ./
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/.prisma-cli-version ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/templates ./templates

# Timeweb: без EXPOSE платформа слушает 8080; приложение читает PORT.
EXPOSE 3000

# migrate deploy + server.js (standalone). Не pm2.
CMD ["npm", "run", "start:platform"]
