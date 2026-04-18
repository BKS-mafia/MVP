# Stage 1: Build the application
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production runner
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy package files
COPY --from=builder /app/package*.json ./

# Install all dependencies (needed for next binary)
RUN npm ci

# Copy all necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules/next ./node_modules/next

# Expose the port
EXPOSE 3000

# Start the application using node directly with the next binary path
CMD ["node", "node_modules/next/dist/bin/next", "start"]