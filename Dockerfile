# Timeweb Cloud Apps / Docker.
# Без глобального pm2: платформа сама держит процесс (CMD = start:platform).
# Не добавляйте `RUN npm install -g pm2` — registry.npmjs.org часто даёт ETIMEDOUT на сборке.

FROM node:22-slim AS builder

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# generate из локального prisma (npm ci), без npx и binaries.prisma.sh
# migrate — на старте контейнера
RUN npm run build:platform

FROM node:22-slim AS runner

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

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
