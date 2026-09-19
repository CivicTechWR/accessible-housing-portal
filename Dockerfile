FROM node:22.14.0-slim

WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .
RUN npm run build

# Next.js writes image and incremental caches into its build directory.
RUN mkdir -p .next/cache && chown -R node:node .next

ENV NODE_ENV=production
ENV PORT=3100

EXPOSE 3100

USER node

CMD ["sh", "-c", "npm run start -- --hostname 0.0.0.0 --port ${PORT}"]
