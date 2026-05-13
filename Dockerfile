# ================================
# Stage 1: Build React client
# ================================
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# ================================
# Stage 2: Build Node server
# ================================
FROM node:20-alpine AS server-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install
COPY server/ ./
RUN npx prisma generate
RUN npm run build

# ================================
# Stage 3: Production image
# ================================
FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app

# Copy server build artifacts
COPY --from=server-build /app/server/dist ./dist
COPY --from=server-build /app/server/node_modules ./node_modules
COPY --from=server-build /app/server/prisma ./prisma
COPY --from=server-build /app/server/package.json ./

# Copy React build → served as static files by Express
COPY --from=client-build /app/client/dist ./public

# Copy version file (embedded in image for /api/version endpoint)
COPY version.txt ./

# Copy and set up entrypoint
COPY server/entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
