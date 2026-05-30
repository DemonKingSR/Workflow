FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Generate Prisma Client
RUN npx prisma generate --schema=src/prisma/schema.prisma || true

# Compile TypeScript
RUN npm run build || true

EXPOSE 5000

CMD ["sh", "-c", "npx prisma db push --schema=src/prisma/schema.prisma && node dist/prisma/seed.js && node dist/index.js"]
