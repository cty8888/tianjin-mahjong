FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
RUN npm install

COPY packages/shared packages/shared/
COPY packages/server packages/server/
COPY packages/client packages/client/

RUN npm run build -w packages/client
RUN npx tsc -p packages/server/tsconfig.json --outDir packages/server/dist || true

FROM base AS runner
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/packages /app/packages
COPY --from=build /app/package.json /app/

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["node", "packages/server/dist/index.js"]
