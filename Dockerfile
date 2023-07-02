FROM node:lts-slim

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends \
    # prisma dep
    openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY libs/prisma ./libs/prisma/

RUN chown -R node:node /app

USER node

RUN npm install

COPY --chown=node:node . .

RUN npx nx run-many \
    --targets=build \
    --configuration=production
