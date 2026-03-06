FROM node:20-bookworm-slim AS base
WORKDIR /app

<<<<<<< HEAD
# 1) Install deps without running postinstall (prisma schema not copied yet)
COPY package*.json ./
RUN npm ci --ignore-scripts

# 2) Copy source (including prisma/schema.prisma)
COPY . .

# 3) Run generation/build after schema is present
RUN npm run postinstall && npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
=======
COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate

EXPOSE 3000
CMD ["npm", "run", "dev"]
>>>>>>> origin/main
