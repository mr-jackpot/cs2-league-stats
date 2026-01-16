FROM node:20-alpine

WORKDIR /app

# Install all dependencies (including dev for build)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY tsconfig.json ./
COPY src/ ./src/
COPY openapi.yaml ./
RUN npm run build

# Remove dev dependencies
RUN npm prune --omit=dev

EXPOSE 8080
ENV PORT=8080

CMD ["node", "dist/index.js"]
