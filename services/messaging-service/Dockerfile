FROM node:20

WORKDIR /app

COPY services/messaging-service/package*.json ./
RUN npm install

COPY services/messaging-service ./services/messaging-service
COPY shared ./shared

WORKDIR /app/services/messaging-service

RUN npx prisma generate

CMD ["node", "src/index.js"]