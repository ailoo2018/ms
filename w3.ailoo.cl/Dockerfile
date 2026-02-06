FROM node:20-alpine
WORKDIR /app

# Copy root configs and workspaces
COPY package*.json ./
COPY w3.ailoo.cl/package*.json ./w3.ailoo.cl/
COPY packages/shared-libs/package*.json ./packages/shared-libs/

RUN npm install

# Copy source
COPY w3.ailoo.cl ./w3.ailoo.cl
COPY packages ./packages

# Build shared libs
RUN npm run build --workspace=@ailoo/shared-libs
RUN npm run build --workspace=w3.ailoo.cl

# Copy application code
COPY ./w3.ailoo.cl/dist ./w3.ailoo.cl
#COPY packages ./packages

# Build main app
WORKDIR /app/w3.ailoo.cl
EXPOSE 3000


# Start the compiled JS version
# We use the 'dist' folder defined in tsconfig outDir
CMD ["node", "./app.js"]