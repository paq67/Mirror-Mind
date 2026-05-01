FROM node:22-slim

RUN npm install -g pnpm

WORKDIR /app

COPY . .

RUN pnpm install --no-frozen-lockfile

RUN pnpm build

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "artifacts/api-server/dist/index.mjs"]
