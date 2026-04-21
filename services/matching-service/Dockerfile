FROM node:20

WORKDIR /app

COPY services/matching-service/package*.json ./
RUN npm install

COPY services/matching-service ./services/matching-service
COPY shared ./shared

WORKDIR /app/services/matching-service

RUN npx prisma generate

CMD ["node", "src/index.js"]