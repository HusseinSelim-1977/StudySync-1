FROM node:20

WORKDIR /app

COPY services/profile-service/package*.json ./
RUN npm install

COPY services/profile-service ./services/profile-service
COPY shared ./shared

WORKDIR /app/services/profile-service

RUN npx prisma generate

CMD ["node", "src/index.js"]