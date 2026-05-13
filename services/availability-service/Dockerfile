FROM node:20

WORKDIR /app

COPY services/availability-service/package*.json ./
RUN npm install

COPY services/availability-service ./services/availability-service
COPY shared ./shared

WORKDIR /app/services/availability-service

RUN npx prisma generate

CMD ["sh", "-c", "npx prisma db push && node src/index.js"]