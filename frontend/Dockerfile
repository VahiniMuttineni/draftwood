FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
# If there's a bun.lock or package-lock.json we can copy them too, but assuming npm
COPY package-lock.json* ./
RUN npm ci

COPY . .
# We need to set env vars if they are required at build time, 
# but Next.js usually only requires NEXT_PUBLIC_ vars at build time.
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3203

# Next.js standalone output automatically traces dependencies
# so we only need to copy the standalone folder and public assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3203
CMD ["node", "server.js"]
