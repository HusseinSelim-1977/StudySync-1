FROM node:20

WORKDIR /app

COPY gateway/package*.json ./
RUN npm install

COPY gateway ./gateway
COPY shared ./shared

WORKDIR /app/gateway

CMD ["node", "index.js"]