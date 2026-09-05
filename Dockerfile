FROM node:22.14.0-slim

WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3100

EXPOSE 3100

CMD ["sh", "-c", "npm run start -- --hostname 0.0.0.0 --port ${PORT}"]
