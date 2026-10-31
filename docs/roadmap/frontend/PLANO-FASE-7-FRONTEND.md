# SGMS — Planejamento Detalhado: Fase 7 (Frontend & Proxy Reverso Nginx)

> **Documento:** Plano de Execução Técnica & Checklist Sequencial da Fase 7 (Containerização Multi-Stage do Frontend React/Vite + Servidor Nginx Porta 80 com SPA Fallback, Cache PWA e Proxy Reverso `/api`)  
> **Status:** 🟢 Concluído (1 de 1 Tarefa Concluída — 100%)  
> **Módulo:** Frontend & Servidor Web (React 18 + Vite + PWA + Nginx 1.27 Alpine)  
> **Data de Criação:** 2026-10-31  
> **Fonte da Verdade:** [05-arquitetura.md](file:///home/ferreito/SGMS/docs/05-arquitetura.md) | [ROADMAP-GERAL.md](file:///home/ferreito/SGMS/docs/roadmap/ROADMAP-GERAL.md) | [ROADMAP-FRONTEND.md](file:///home/ferreito/SGMS/docs/roadmap/frontend/ROADMAP-FRONTEND.md)  

---

## 1. Visão Geral e Princípios Operacionais da Entrega

1. **Exposição Unificada na Porta `80` (`RNF-02`):** Em produção na planta da GEPF Agroindústria, os celulares, tablets e computadores acessam diretamente `http://sgms.local` ou `http://<IP_FIXO_DO_LINUX>` na porta `80` padrão, sem digitar números de porta (`:5173` ou `:3001`).
2. **Proxy Reverso `/api` Interno e SPA Routing (`RNF-05`):** O Nginx entrega os arquivos estáticos compilados (`dist/`) com `try_files $uri $uri/ /index.html` (garantindo que qualquer rota do React Router recarregue sem erro `404`) e encaminha todas as chamadas `/api/*` para `http://sgms-backend:3001/api/*` dentro da rede interna do Docker.
3. **Política de Cache PWA Determinística (`RNF-06`):** `index.html`, `sw.js`, `registerSW.js` e `manifest.webmanifest` recebem `Cache-Control: no-cache, no-store, must-revalidate` para que atualizações de versão reflitam imediatamente nos dispositivos móveis, enquanto `/assets/*` (com hash no nome) utiliza cache imutável de 1 ano com compressão `gzip`.

---

## 2. Matriz de Cobertura de Artefatos

| Artefato | Caminho Alvo | Requisitos | Comportamento Operacional / Regra |
| :--- | :--- | :---: | :--- |
| `frontend/nginx.conf` | `frontend/nginx.conf` | `RNF-02`, `RNF-05`, `RNF-06` | Porta `80`, compressão `gzip`, proxy reverso `/api/` $\rightarrow$ `http://sgms-backend:3001/api/`, SPA fallback e headers PWA |
| `frontend/Dockerfile` & `frontend/.dockerignore` | `frontend/Dockerfile`, `frontend/.dockerignore` | `RNF-02`, `RNF-06` | Build multi-stage (`node:20-alpine` com `VITE_API_URL=/api` $\rightarrow$ `nginx:1.27-alpine`) |

---

## 3. Status Geral da Fase

```
Progresso da Fase 7 (Frontend): [================================] 100% Concluído (1 de 1 tarefa)
```

| ID | Tarefa | Status | Módulo / Artefatos |
| :---: | :--- | :---: | :--- |
| **7.1** | Criação de `frontend/nginx.conf`, `frontend/Dockerfile` Multi-Stage e `frontend/.dockerignore` | 🟢 Concluída | `frontend/nginx.conf`, `frontend/Dockerfile`, `frontend/.dockerignore` |

---

## 4. Detalhamento Técnico das Tarefas

---

### 🟢 Tarefa 7.1: Criação de `frontend/nginx.conf`, `frontend/Dockerfile` Multi-Stage e `frontend/.dockerignore`
- **Objetivo:** Construir a imagem de produção do Frontend servida por Nginx na porta `80` com roteamento SPA, cache PWA apropriado e proxy reverso transparente `/api` para o container `sgms-backend`.
- **Arquivos a Criar:**
  - `frontend/.dockerignore`
  - `frontend/nginx.conf`
  - `frontend/Dockerfile`
- **Checklist de Execução Detalhado:**
  - [x] Criar `frontend/.dockerignore` excluindo `node_modules`, `dist`, `.env` e `.git`
  - [x] Criar `frontend/nginx.conf` contendo:
    - [x] Escuta na porta `80` (`listen 80;`) e `root /usr/share/nginx/html;`
    - [x] Habilitação de compressão `gzip` para `text/plain`, `text/css`, `application/json`, `application/javascript`, `image/svg+xml`
    - [x] Bloco `location /api/` com `proxy_pass http://sgms-backend:3001/api/;` e repasse de headers (`Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`)
    - [x] Bloco para `index.html`, `sw.js`, `registerSW.js` e `manifest.webmanifest` com `add_header Cache-Control "no-cache, no-store, must-revalidate";`
    - [x] Bloco `location /assets/` com `expires 1y; add_header Cache-Control "public, immutable";`
    - [x] Bloco `location /` com `try_files $uri $uri/ /index.html;`
  - [x] Criar `frontend/Dockerfile` multi-stage:
    - [x] Estágio `builder` (`node:20-alpine`): definir `ENV VITE_API_URL=/api` e `ENV VITE_APP_NAME=SGMS`, rodar `npm ci` e `npm run build`
    - [x] Estágio `runner` (`nginx:1.27-alpine`): copiar `frontend/nginx.conf` para `/etc/nginx/conf.d/default.conf`, copiar `/app/dist` para `/usr/share/nginx/html` e expor porta `80`
- **Critérios de Aceite e Verificação Obrigatória:**
  - [x] **Caminho Normal:** `npm --prefix frontend run build` compila sem erros com `VITE_API_URL=/api` e o `nginx.conf` atende integralmente às rotas do SPA e ao proxy `/api`.

---

## 5. Auditoria de Zero Fallback

- A variável `VITE_API_URL=/api` é injetada explicitamente no estágio de build do `frontend/Dockerfile`, mantendo o contrato estrito de `frontend/src/lib/api-client.ts` sem fallbacks ocultos no código TypeScript.

---

## 6. Roteiro de Homologação Final da Fase 7 (Frontend)

1. Verificar `frontend/nginx.conf`, `frontend/Dockerfile` e `frontend/.dockerignore`.
2. Confirmar `npm --prefix frontend run build` 100% verde.

