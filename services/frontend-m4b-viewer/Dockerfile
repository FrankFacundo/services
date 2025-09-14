# Multi-stage build for Next.js with optional ffprobe
FROM node:20-bookworm AS deps

WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN if [ -f pnpm-lock.yaml ]; then corepack enable && pnpm install --frozen-lockfile; \
    elif [ -f yarn.lock ]; then yarn --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    else npm install; fi

FROM node:20-bookworm AS builder
ARG USE_FFPROBE=false
RUN if [ "$USE_FFPROBE" = "true" ]; then apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*; fi
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-bookworm AS runner
ARG USE_FFPROBE=false
RUN if [ "$USE_FFPROBE" = "true" ]; then apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*; fi
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["npm", "run", "start"]

