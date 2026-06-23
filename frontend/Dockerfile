# Frontend — TEAM FF | CONSULTORIA (Next.js 14)
# Em modo demo rodamos `next dev` para máxima robustez (sem etapa de build).
FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 3000

# -H 0.0.0.0 para o navegador no host acessar o container
CMD ["npx", "next", "dev", "-H", "0.0.0.0"]
