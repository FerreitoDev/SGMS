# ==============================================================================
# Estágio 1: Builder (Compilação TypeScript, Vite Build & Geração do PWA)
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

ENV VITE_API_URL=/api
ENV VITE_APP_NAME=SGMS

RUN npm run build

# ==============================================================================
# Estágio 2: Runner (Servidor Nginx Porta 80 + Proxy Reverso /api)
# ==============================================================================
FROM nginx:1.27-alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

