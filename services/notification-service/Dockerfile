FROM node:20

WORKDIR /app

COPY services/notification-service/package*.json ./
RUN npm install

COPY services/notification-service ./services/notification-service
COPY shared ./shared

WORKDIR /app/services/notification-service

RUN npx prisma generate

CMD ["node", "src/index.js"]