FROM node:20

WORKDIR /app

COPY services/user-service/package*.json ./
RUN npm install

COPY services/user-service ./services/user-service
COPY shared ./shared

WORKDIR /app/services/user-service

RUN npx prisma generate

CMD ["sh", "-c", "npx prisma db push && node src/index.js"]
