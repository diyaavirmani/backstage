# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_SANITY_PROJECT_ID
ARG NEXT_PUBLIC_SANITY_DATASET
ENV NEXT_PUBLIC_SANITY_PROJECT_ID=${NEXT_PUBLIC_SANITY_PROJECT_ID}
ENV NEXT_PUBLIC_SANITY_DATASET=${NEXT_PUBLIC_SANITY_DATASET}
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    BACKSTAGE_APP_ROOT=/app
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
# These files are loaded by the operational API at runtime and are copied
# explicitly in addition to Next.js output-file tracing.
COPY --from=builder --chown=node:node /app/db ./db
COPY --from=builder --chown=node:node \
  /app/scripts/operations-store.mjs \
  /app/scripts/deployment-controls.mjs \
  /app/scripts/agent-input.mjs \
  /app/scripts/agent-retrieval.mjs \
  /app/scripts/agent-validation.mjs \
  /app/scripts/context-citations.mjs \
  /app/scripts/context-outline.mjs \
  ./scripts/
COPY --from=builder --chown=node:node /app/src/data/research-catalog.json ./src/data/research-catalog.json
USER node
EXPOSE 3000
CMD ["node", "server.js"]
