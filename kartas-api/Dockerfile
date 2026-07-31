FROM node:18-alpine

# BKP-02: pg_dump/pg_restore, matching the postgres:16-alpine server's major version
RUN apk add --no-cache postgresql16-client

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
