# 1. Build Stage
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build:ts

# 2. Production Stage
FROM node:22-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# ✅ 마이그레이션은 build 시 하지 않음

EXPOSE 3000

# ✅ ENTRYPOINT에서 prisma migrate 실행 (실제 런타임에서 DB 접근 가능할 때!)
ENTRYPOINT ["/bin/sh", "-c", "npx prisma migrate deploy && npm run prod"]
