FROM node:20

WORKDIR /app

COPY services/user-service/package*.json ./
RUN npm install

COPY services/user-service .
COPY shared ./shared

RUN npx prisma generate

CMD ["node", "src/index.js"]