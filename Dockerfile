# Multi-stage build for React (Vite) + Node/Express API

# -------- Build stage: install deps and build frontend --------
FROM node:20-slim AS build
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy sources and build
COPY . .
RUN npm run build


# -------- Runtime stage: slim Node image, prod deps only --------
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Copy environment file
COPY .env.docker .env

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy server code and built frontend
COPY server ./server
# Copy built frontend from the build stage
COPY --from=build /app/dist ./dist

# Expose Express port
EXPOSE 5000

# Start the API server
CMD ["node", "server/index.js"]
