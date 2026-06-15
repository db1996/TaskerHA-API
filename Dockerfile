FROM node:22-alpine

# Native module build tools
RUN apk add --no-cache python3 make g++

RUN npm install -g pnpm node-gyp

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod --ignore-scripts
RUN cd /app/node_modules/better-sqlite3 && node-gyp rebuild

COPY src/ ./src/

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "src/server.js"]
