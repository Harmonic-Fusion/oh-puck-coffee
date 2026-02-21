FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
# Install pnpm
RUN corepack enable
# Copy dependency files
COPY package.json pnpm-lock.yaml ./
# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
RUN corepack enable
# Install git for next.config.ts commit SHA generation
RUN apk add --no-cache git
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build the application
RUN pnpm build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -g 1001 nodejs
RUN adduser -u 1001 -G nodejs -D -s /bin/sh nextjs

# Copy the public folder
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Install tsx globally for running TypeScript migration scripts (before switching user)
RUN npm install -g tsx

# Copy migration scripts and drizzle migrations for runtime migrations
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle

# Copy migration script dependencies from the builder's pnpm store.
# The Next.js standalone trace doesn't include these since migrate.ts runs outside Next.js.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/postgres ./node_modules/postgres

# Make start script executable
RUN chmod +x scripts/start.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run migrations before starting the server
CMD ["./scripts/start.sh"]

# noop
