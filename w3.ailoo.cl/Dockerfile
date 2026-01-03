FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY w3.ailoo.cl ./w3.ailoo.cl
COPY packages ./packages
RUN npm install
WORKDIR /app/w3.ailoo.cl
CMD ["node", "app.js"]