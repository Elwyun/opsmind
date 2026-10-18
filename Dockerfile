# OpsMind — production image for Google Cloud Run.
#
# The build does NOT need a database (all routes are dynamic), so no secrets
# are baked into the image. At runtime the service needs:
#   DATABASE_URL    - managed PostgreSQL (e.g. Neon / Cloud SQL), server-side
#   GEMINI_API_KEY  - optional; empty => the labelled mock investigator
#   GEMINI_MODEL    - optional, defaults to gemini-3.8-flash

FROM node:22-slim AS builder
WORKDIR /app

# CI=1 keeps Prisma from prompting, and the placeholder URL only satisfies
# config loading during `prisma generate` / `next build` — nothing connects.
ENV CI=1 \
    DATABASE_URL="postgres://build-placeholder@127.0.0.1:5432/build"

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/src ./src
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/scripts ./scripts
COPY next.config.ts ./

EXPOSE 8080
CMD ["npm", "start"]
