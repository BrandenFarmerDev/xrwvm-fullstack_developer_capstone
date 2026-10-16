FROM node:18.12.1-bullseye-slim
WORKDIR /app
RUN npm install -g npm@9.1.3
COPY package*.json ./
RUN npm install --omit=dev
COPY app.js inventory.js ./
COPY data ./data
EXPOSE 3050
CMD ["node", "app.js"]
