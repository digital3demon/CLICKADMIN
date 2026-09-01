# Timeweb: только инструкции образа. Без apt, без HEALTHCHECK
# (платформа иначе ставит системный curl и ходит на deb.debian.org).
# Тип приложения в панели — «Dockerfile». Не Node.js/Express и не `npm install -g pm2`.
# pg_dump/psql — копируем из официального postgres, не через apt.

FROM postgres:16-bookworm AS pgclient

# Бинарники + их .so (без apt в runner). libc/ld не копируем — они уже в node-образе.
RUN mkdir -p /pg-client/bin /pg-client/lib \
  && cp /usr/lib/postgresql/16/bin/pg_dump /usr/lib/postgresql/16/bin/psql /pg-client/bin/ \
  && for bin in /pg-client/bin/pg_dump /pg-client/bin/psql; do \
       ldd "$bin"; \
     done \
  | awk '/=> \// { print $3 }' \
  | grep -vE 'libc\.so|libm\.so|libpthread|libdl\.so|ld-linux' \
  | sort -u \
  | while read -r lib; do \
      if [ -f "$lib" ]; then cp -L "$lib" /pg-client/lib/; fi; \
    done

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
COPY --from=pgclient /pg-client/bin/pg_dump /usr/local/bin/pg_dump
COPY --from=pgclient /pg-client/bin/psql /usr/local/bin/psql
COPY --from=pgclient /pg-client/lib /usr/local/lib/pg-client

# Standalone cwd = /app/.next/standalone (read-only для mkdir). Дампы и lock — сюда.
RUN mkdir -p /app/data/crm-dumps && chmod -R 777 /app/data

ENV PG_DUMP_PATH=/usr/local/bin/pg_dump
ENV PSQL_PATH=/usr/local/bin/psql
ENV LD_LIBRARY_PATH=/usr/local/lib/pg-client

EXPOSE 3000

CMD ["npm", "run", "start:platform"]
