FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
# Use pnpm if workspace allows, otherwise npm
RUN npm install -g pnpm
COPY pnpm-lock.yaml* ./
RUN pnpm install

COPY . .
RUN pnpm run build

FROM node:22-alpine AS runner

WORKDIR /app
RUN npm install -g pnpm
COPY package*.json ./
COPY pnpm-lock.yaml* ./
RUN pnpm install --prod

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=3202

EXPOSE 3202
CMD ["npm", "run", "start"]
