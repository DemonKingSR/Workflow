FROM node:20-alpine

WORKDIR /app

# Set default environment variables for seamless out-of-the-box deployments
ENV DATABASE_URL="file:./dev.db"
ENV PORT=5000
ENV NODE_ENV=production
ENV JWT_SECRET=workflow_jwt_secret_token_key_2026

COPY package*.json ./

RUN npm install

COPY . .

# Generate Prisma Client
RUN npx prisma generate --schema=src/prisma/schema.prisma || true

# Compile TypeScript
RUN npm run build || true

EXPOSE 5000

CMD ["sh", "-c", "npx prisma db push --schema=src/prisma/schema.prisma && node dist/prisma/seed.js && node dist/index.js"]
