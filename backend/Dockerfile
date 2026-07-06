# --- STAGE 1: BUILD ---
FROM node:24-alpine AS builder

WORKDIR /usr/src/app

# Copy dependency manifests
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (including devDependencies for build step)
RUN npm ci

# Copy application source code
COPY . .

# Generate Prisma Client code
RUN npx prisma generate

# Build the NestJS application
RUN npm run build

# --- STAGE 2: PRODUCTION RUNNER ---
FROM node:24-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copy manifests
COPY package*.json ./

# Install ONLY production dependencies to keep the image slim
RUN npm ci --omit=dev

# Copy generated Prisma Client and compiled NestJS code from builder
COPY --from=builder /usr/src/app/node_modules/@prisma /usr/src/app/node_modules/@prisma
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma

# Expose port (Render/Railway will override PORT env variable)
EXPOSE 3001

# Run database schema push to sync schema on startup, then boot NestJS
CMD npx prisma db push --skip-generate && node dist/src/main.js
