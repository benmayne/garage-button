FROM node:22-alpine
# Node bundles its own root store, which still trusts the compromised eMudhra
# intermediates (Oct 2026). Use Alpine's patched ca-certificates instead.
RUN apk upgrade --no-cache ca-certificates-bundle
ENV NODE_OPTIONS=--use-openssl-ca \
    SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server.js ./
COPY public ./public

EXPOSE 3000
CMD ["node", "server.js"]
