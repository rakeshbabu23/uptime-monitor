FROM node:20-slim

WORKDIR /app

# better-sqlite3 compiles from source on arm64 — needs these once (layer is cached)
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV DB_PATH=/data/monitor.db

EXPOSE 9000

CMD ["node", "server.js"]
