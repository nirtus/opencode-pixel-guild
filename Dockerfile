FROM node:22-alpine

RUN apk add --no-cache git && \
    git config --global --add safe.directory '*' && \
    git config --global core.autocrlf true && \
    git config --global user.email "guild@opencode.local" && \
    git config --global user.name "Guild Operator"

WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4310 \
    OPENCODE_DOCKER_HOST=host.docker.internal

COPY package.json tsconfig.json GLOSSARY.md ./
COPY src ./src
COPY docs ./docs

EXPOSE 4310

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4310/api/guild/snapshot >/dev/null || exit 1

CMD ["node", "--experimental-strip-types", "--no-warnings=ExperimentalWarning", "src/server/main.ts"]
