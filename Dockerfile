FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --include=dev
COPY . .
RUN npm run typecheck && npm run build:server && npm prune --omit=dev

FROM node:22-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.server-build ./.server-build
COPY --from=build /app/package.json ./package.json
USER node
EXPOSE 3001
CMD ["node", ".server-build/main.mjs"]
