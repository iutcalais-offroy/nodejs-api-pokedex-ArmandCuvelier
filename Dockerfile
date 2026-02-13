FROM node:20-bookworm-slim
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

ENV DATABASE_URL="postgresql://postgres:kRybtEvmGgHQxIzFPcdmnMKJbwfzFEDh@postgres.railway.internal:5432/railway"

RUN npx prisma generate

RUN npm prisma db:migrate

RUN npm run build

CMD ["npm run start"]