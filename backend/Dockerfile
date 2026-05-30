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

CMD ["npm", "run", "dev"]
