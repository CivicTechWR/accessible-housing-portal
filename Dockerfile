FROM node:22.14.0-slim

RUN apt-get update && apt-get install -y --no-install-recommends openssl curl bash ca-certificates \
    && curl -1sLf 'https://artifacts-cli.infisical.com/setup.deb.sh' | bash \
    && apt-get install -y --no-install-recommends infisical \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3100

EXPOSE 3100

CMD ["sh", "-c", "infisical run --env=prod --projectId=2980a086-4367-4a1a-aafd-d1f5d4879253 -- sh -c 'npm run start -- --hostname 0.0.0.0 --port ${PORT}'"]
