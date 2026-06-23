# Backend — TEAM FF | CONSULTORIA (Fastify + TypeScript via tsx)
FROM node:20-alpine

WORKDIR /app

# Instala dependências primeiro (cache de camada)
COPY package.json ./
RUN npm install

# Código-fonte
COPY tsconfig.json ./
COPY src ./src

EXPOSE 4000

# tsx executa TypeScript direto, sem etapa de build (ideal para o demo)
CMD ["npm", "run", "start"]
