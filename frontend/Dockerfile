FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# In docker development, we can run in dev mode
EXPOSE 3000

CMD ["npm", "run", "dev"]
