FROM node:22-slim
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npx tsc
ENV NODE_ENV=production
# Qovluqlar həcm (volume) kimi bağlanır; proses root olmadan işləyir
RUN mkdir -p /data/uploads /data/private-uploads /data/safety-evidence && chown -R node:node /data
USER node
EXPOSE 4000
# Miqrasiyalar → hədiyyə/paket kataloqu (demo istifadəçisiz) → zərif dayanma üçün node birbaşa PID 1-də (exec)
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/seed.ts && exec node dist/src/index.js"]
