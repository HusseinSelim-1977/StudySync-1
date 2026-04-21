FROM node:20

WORKDIR /app

COPY services/session-service/package*.json ./
RUN npm install

COPY services/session-service ./services/session-service
COPY shared ./shared

WORKDIR /app/services/session-service

RUN npx prisma generate

CMD ["node", "src/index.js"]