# SGMS — Planejamento Detalhado: Fase 7 (Backend & Infraestrutura On-Premise)

> **Documento:** Plano de Execução Técnica & Checklist Sequencial da Fase 7 (Containerização Multi-Stage do Backend, Orquestração `docker-compose.yml` para Servidor Linux On-Premise e `README.md` Central)  
> **Status:** ⚪ A Iniciar (0 de 3 Tarefas Concluídas — 0%)  
> **Módulo:** Backend & Infraestrutura (NestJS 10 + Prisma ORM + PostgreSQL 16 + Docker Compose)  
> **Data de Criação:** 2026-10-31  
> **Fonte da Verdade:** [05-arquitetura.md](file:///home/ferreito/SGMS/docs/05-arquitetura.md) | [ROADMAP-GERAL.md](file:///home/ferreito/SGMS/docs/roadmap/ROADMAP-GERAL.md) | [ROADMAP-BACKEND.md](file:///home/ferreito/SGMS/docs/roadmap/backend/ROADMAP-BACKEND.md)  

---

## 1. Visão Geral e Princípios Operacionais da Entrega

1. **Containerização Multi-Stage Determinística (`backend/Dockerfile`):** Compilar a aplicação NestJS 10 e gerar o Prisma Client em estágio `builder` (Node 20 Alpine com OpenSSL) e produzir uma imagem enxuta de produção que aplica automaticamente as migrações pendentes (`npx prisma migrate deploy`) antes de iniciar `node dist/main.js`.
2. **Orquestração On-Premise Resiliente (`docker-compose.yml` & `.env.production.example`):** Subir toda a pilha na planta fabril (`sgms-db`, `sgms-backend` e `sgms-web`) com política `restart: unless-stopped`, `healthcheck` no PostgreSQL 16, persistência em volume nomeado (`sgms_pgdata`) e validação explícita de variáveis de ambiente obrigatórias (`:${VAR:?erro}`) obedecendo à Diretriz Global de Zero Fallback.
3. **Documentação Operacional Central (`README.md`):** Consolidar na raiz do repositório um guia técnico completo e autoexplicativo cobrindo: arquitetura do sistema, execução em desenvolvimento (Linux/WSL2 + acesso via celular na LAN), implantação em produção em servidor Linux (Ubuntu Server 24.04 LTS + Docker Compose + IP Fixo Netplan + mDNS `http://sgms.local`), credenciais de acesso inicial e rotinas de backup/restore do banco de dados.

---

## 2. Matriz de Cobertura de Artefatos

| Artefato | Caminho Alvo | Requisitos | Comportamento Operacional / Regra |
| :--- | :--- | :---: | :--- |
| `backend/Dockerfile` & `backend/.dockerignore` | `backend/Dockerfile`, `backend/.dockerignore` | `RNF-01`, `RNF-02` | Build multi-stage Node 20 Alpine, Prisma Client e boot com `prisma migrate deploy && node dist/main.js` |
| `docker-compose.yml` & `.env.production.example` | `docker-compose.yml`, `.env.production.example` | `RNF-01`, `RNF-02`, `RNF-07` | Orquestra `sgms-db` (PostgreSQL 16), `sgms-backend` (:3001 interna) e `sgms-web` (:80 LAN) sem fallbacks de senha |
| `README.md` Central | `README.md` | `RNF-02`, `RNF-06` | Documentação central unificada (Arquitetura, Dev Local/WSL2, Deploy Produção Linux Ubuntu 24.04 LTS, Netplan, mDNS e Backup) |

---

## 3. Status Geral da Fase

```
Progresso da Fase 7 (Backend): [--------------------------------] 0% Concluído (0 de 3 tarefas)
```

| ID | Tarefa | Status | Módulo / Artefatos |
| :---: | :--- | :---: | :--- |
| **7.1** | Criação de `backend/Dockerfile` Multi-Stage e `backend/.dockerignore` | ⚪ Pendente | `backend/Dockerfile`, `backend/.dockerignore` |
| **7.2** | Criação de `docker-compose.yml` e `.env.production.example` na Raiz | ⚪ Pendente | `docker-compose.yml`, `.env.production.example` |
| **7.3** | Elaboração do `README.md` Central de Arquitetura, Dev Local e Deploy Linux | ⚪ Pendente | `README.md` |

---

## 4. Detalhamento Técnico das Tarefas

---

### ⬜ Tarefa 7.1: Criação de `backend/Dockerfile` Multi-Stage e `backend/.dockerignore`
- **Objetivo:** Empacotar o backend NestJS 10 + Prisma ORM em imagem Docker enxuta e segura (Node 20 Alpine), garantindo aplicação automática de migrations no boot.
- **Arquivos a Criar:**
  - `backend/.dockerignore`
  - `backend/Dockerfile`
- **Checklist de Execução Detalhado:**
  - [ ] Criar `backend/.dockerignore` excluindo `node_modules`, `dist`, `.env`, `coverage` e `.git`
  - [ ] Criar `backend/Dockerfile` em 2 estágios (`node:20-alpine`):
    - [ ] Estágio `builder`: instalar `openssl`, copiar `package*.json` e `prisma/`, rodar `npm ci`, copiar código-fonte, executar `npx prisma generate` e `npm run build` (`nest build`), seguido de `npm prune --omit=dev`
    - [ ] Estágio `runner`: instalar `openssl` (requerido pelo query engine do Prisma), definir `NODE_ENV=production`, copiar `node_modules`, `dist`, `package.json` e `prisma/` do `builder`, expor porta `3001` e definir `CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]`
- **Critérios de Aceite e Verificação Obrigatória:**
  - [ ] **Caminho Normal:** `npm --prefix backend run build` continua 100% verde e `backend/Dockerfile` segue todas as dependências de runtime do Prisma + PDFKit.

---

### ⬜ Tarefa 7.2: Criação de `docker-compose.yml` e `.env.production.example` na Raiz
- **Objetivo:** Orquestrar os containers de banco de dados (`sgms-db`), API (`sgms-backend`) e servidor web/proxy (`sgms-web`) com persistência, healthcheck, reinício automático e falha explícita caso variáveis obrigatórias estejam ausentes.
- **Arquivos a Criar:**
  - `docker-compose.yml`
  - `.env.production.example`
- **Checklist de Execução Detalhado:**
  - [ ] Criar `.env.production.example` documentando as variáveis obrigatórias (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `JWT_SECRET`, `JWT_EXPIRES_IN=12h`, `HTTP_PORT=80`)
  - [ ] Criar `docker-compose.yml` na raiz do repositório com:
    - [ ] Serviço `sgms-db` (`postgres:16-alpine`): `restart: unless-stopped`, volume persistente `sgms_pgdata:/var/lib/postgresql/data`, `healthcheck` com `pg_isready` e variáveis exigidas via sintaxe estrita `${POSTGRES_PASSWORD:?Defina POSTGRES_PASSWORD no arquivo .env}` (Zero Fallback)
    - [ ] Serviço `sgms-backend` (build `./backend`): `restart: unless-stopped`, `depends_on` aguardando `sgms-db` (`condition: service_healthy`), injetando `DATABASE_URL`, `JWT_SECRET` obrigatório (`${JWT_SECRET:?Defina JWT_SECRET no arquivo .env}`) e `PORT=3001`
    - [ ] Serviço `sgms-web` (build `./frontend`): `restart: unless-stopped`, `depends_on: [sgms-backend]`, expondo a porta `80` da LAN (`"${HTTP_PORT:-80}:80"`)
- **Critérios de Aceite e Verificação Obrigatória:**
  - [ ] **Violação de Contrato (Zero Fallback):** Subir o `docker compose` sem definir `POSTGRES_PASSWORD` ou `JWT_SECRET` interrompe imediatamente a execução com mensagem explícita de erro, sem usar senhas padrão ocultas.

---

### ⬜ Tarefa 7.3: Elaboração do `README.md` Central de Arquitetura, Dev Local e Deploy Linux
- **Objetivo:** Criar o `README.md` principal na raiz do repositório explicando de ponta a ponta o funcionamento do SGMS, como rodar em desenvolvimento (PC/WSL2 + celular no Wi-Fi) e como instalar em produção em um servidor Linux (Ubuntu Server 24.04 LTS) no cliente.
- **Arquivos a Criar:**
  - `README.md`
- **Checklist de Execução Detalhado:**
  - [ ] Estruturar `README.md` com:
    - [ ] **1. Visão Geral & Arquitetura On-Premise:** Propósito do SGMS, diagrama de arquitetura LAN, stack tecnológica e regras de domínio principais (alocação 1:1, Local-First IndexedDB, OEE com segregação de refeição/intervalo)
    - [ ] **2. Guia de Desenvolvimento Local (PC / WSL2 + Celular na Rede Wi-Fi):** Pré-requisitos, configuração de `.env`, `prisma migrate deploy` + `prisma db seed`, inicialização do backend/frontend e ponte de rede WSL2 para testar pelo smartphone
    - [ ] **3. Guia de Implantação em Produção no Cliente (Servidor Linux Ubuntu 24.04 LTS):**
      - [ ] Recomendação de distribuição e hardware mínimo
      - [ ] Configuração de IP Estático na LAN via **Netplan** (`/etc/netplan/01-netcfg.yaml`)
      - [ ] Configuração de URL fixa amigável (`http://sgms.local`) via **mDNS / Avahi** (`hostnamectl set-hostname sgms` + `avahi-daemon`)
      - [ ] Subida em produção com **Docker Compose** (`cp .env.production.example .env`, `docker compose up -d --build` e execução do seed inicial)
    - [ ] **4. Operação, Manutenção e Backup:** Credenciais iniciais do seed, comando de backup (`pg_dump`) e restauração do PostgreSQL, visualização de logs e atualização de versão
- **Critérios de Aceite e Verificação Obrigatória:**
  - [ ] **Integridade Documental:** Todos os comandos, caminhos de arquivos, portas (`80` em produção via Nginx, `5173`/`3001` em dev) e links para a pasta `docs/` validados.

---

## 5. Auditoria de Zero Fallback

- Variáveis críticas de segurança (`POSTGRES_PASSWORD`, `JWT_SECRET`) em `docker-compose.yml` utilizam obrigatoriamente a sintaxe `${VAR:?mensagem de erro}` sem senhas fallback embutidas no manifesto de produção.

---

## 6. Roteiro de Homologação Final da Fase 7 (Backend)

1. Verificar `backend/Dockerfile`, `docker-compose.yml` e `.env.production.example`.
2. Verificar a clareza e completude do `README.md` na raiz do projeto.
3. Confirmar `npm --prefix backend run build` 100% verde.

