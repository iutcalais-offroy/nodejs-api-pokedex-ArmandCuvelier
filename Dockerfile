FROM node:20-bookworm-slim
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

ENV DATABASE_URL="postgresql://postgres:kRybtEvmGgHQxIzFPcdmnMKJbwfzFEDh@postgres.railway.internal:5432/railway"

RUN npx prisma generate

RUN npm run build

EXPOSE 3000

CMD ["node", "dist/index.js"]