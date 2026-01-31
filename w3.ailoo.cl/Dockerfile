FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY w3.ailoo.cl ./w3.ailoo.cl
COPY packages ./packages
RUN npm install
RUN npm run build --workspace=@ailoo/shared-libs  # compile TS in share-libs
WORKDIR /app/w3.ailoo.cl
CMD ["node", "app.js"]