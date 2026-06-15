FROM node:22-alpine

# Required to compile better-sqlite3 native module
RUN apk add --no-cache python3 make g++

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
# --ignore-scripts skips the pnpm build-approval check; we rebuild the native module explicitly
RUN pnpm install --frozen-lockfile --prod --ignore-scripts
RUN pnpm rebuild better-sqlite3

COPY src/ ./src/

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "src/server.js"]
