FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN echo "Ready to go!"

EXPOSE 5173

CMD ["npm", "run", "dev"]
