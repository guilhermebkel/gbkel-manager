# syntax=docker/dockerfile:1
# The redirect and proxy server of the CapRover adapter. Build from the repository root: docker build .

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-slim
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
WORKDIR /app
# Why: the server imports only Node built-ins, so there is no install step; Node strips the TypeScript types itself (ADR 0004). static/ and pages/ are what the local-target aliases serve.
COPY --chown=node:node package.json domainAliases.json ./
COPY --chown=node:node src ./src
COPY --chown=node:node static ./static
COPY --chown=node:node pages ./pages
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + process.env.PORT + '/healthz').then((response) => process.exit(response.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "src/Setup/ServerSetup.ts"]
