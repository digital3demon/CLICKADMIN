# Timeweb Cloud Apps / Docker.
# Не вызывать apt-get: на сборке часто нет deb.debian.org (Network is unreachable).
# Не `npm install -g pm2` / не `npm install -g npm` — лишний выход в сеть.
# bookworm (не slim): openssl уже в образе.

FROM node:22-bookworm AS builder

WORKDIR /app

# По одному файлу: если нет .npmrc, BuildKit не маскирует это как "/package.json".
COPY package.json ./
COPY package-lock.json ./
COPY .npmrc ./

RUN npm ci --no-audit --no-fund \
  || (npm cache clean --force && npm ci --no-audit --no-fund)

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# migrate — на старте контейнера (start:platform)
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
COPY --from=builder /app/.prisma-cli-js ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/templates ./templates

EXPOSE 3000

CMD ["npm", "run", "start:platform"]
