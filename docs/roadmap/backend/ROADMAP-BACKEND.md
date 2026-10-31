# SGMS — Roadmap Técnico: Backend (Nível 2)

> **Fase Geral Correspondente:** [ROADMAP-GERAL.md](file:///home/ferreito/SGMS/docs/roadmap/ROADMAP-GERAL.md)  
> **Status:** 🟢 Concluído (Fases 1 a 7 Concluídas)  
> **Última Atualização:** 2026-10-31  

---

## 1. Matriz de Fases e Planos Vinculados

| Fase Setorial | Título da Entrega Técnica | Plano de Execução Vinculado | Status |
| :---: | :--- | :--- | :---: |
| **Fase 1** | Fundação, Prisma, Autenticação JWT & Gestão de Usuários | [PLANO-FASE-1-BACKEND.md](file:///home/ferreito/SGMS/docs/roadmap/backend/PLANO-FASE-1-BACKEND.md) | 🟢 Concluída |
| **Fase 2** | Cadastros de Máquinas, Turnos & Alocação 1:1 com Trava ACID | [PLANO-FASE-2-BACKEND.md](file:///home/ferreito/SGMS/docs/roadmap/backend/PLANO-FASE-2-BACKEND.md) | 🟢 Concluída |
| **Fase 3** | Apontamento de Produção, Paradas & Sincronização Idempotente | [PLANO-FASE-3-BACKEND.md](file:///home/ferreito/SGMS/docs/roadmap/backend/PLANO-FASE-3-BACKEND.md) | 🟢 Concluída |
| **Fase 4** | Fechamento de Turno, Agregações & Relatórios (CSV/PDFKit) | [PLANO-FASE-4-BACKEND.md](file:///home/ferreito/SGMS/docs/roadmap/backend/PLANO-FASE-4-BACKEND.md) | 🟢 Concluída |
| **Fase 5** | Pausa Planejada (`REFEICAO_INTERVALO`) & Segregação Estatística OEE | [PLANO-FASE-5-BACKEND.md](file:///home/ferreito/SGMS/docs/roadmap/backend/PLANO-FASE-5-BACKEND.md) | 🟢 Concluída |
| **Fase 6** | Trava Física 1:1 de Máquina, Proteção de Inativação de Operador & Sync de Resolução de Parada | [PLANO-FASE-6-BACKEND.md](file:///home/ferreito/SGMS/docs/roadmap/backend/PLANO-FASE-6-BACKEND.md) | 🟢 Concluída |
| **Fase 7** | Containerização Backend (`Dockerfile`), Orquestração `docker-compose.yml` & `README.md` Central | [PLANO-FASE-7-BACKEND.md](file:///home/ferreito/SGMS/docs/roadmap/backend/PLANO-FASE-7-BACKEND.md) | 🟢 Concluída |

---

## 2. Detalhamento das Fases Técnicas de Backend

### Fase 1: Fundação, Prisma, Autenticação JWT & Gestão de Usuários
- **Referência Hierárquica:** Fase 1 de [ROADMAP-GERAL.md](file:///home/ferreito/SGMS/docs/roadmap/ROADMAP-GERAL.md).
- **Requisitos Técnicos e de Negócio:**
  - `RF-01`: Autenticação e geração de tokens JWT contendo `sub`, `username` e `role`.
  - `RF-02`: Endpoints para criação, edição e inativação de operadores (exclusivo para `GERENTE`).
  - `RNF-01`: Respostas de erro padronizadas segundo RFC 7807 (`application/problem+json`).
  - `RNF-02`: Operação exclusiva em rede local (LAN).
  - `RNF-07`: Hash criptográfico de senhas e proteção de rotas com Guards (`JwtAuthGuard`, `RolesGuard`).
- **Dependências Bloqueantes:** Instalação do runtime Node.js 20 LTS e instância local do PostgreSQL 16.
- **Checklist Técnico Sequencial:**
  - [x] 1.1: Inicialização do projeto NestJS 10 com TypeScript estrito (`nest new backend`)
  - [x] 1.2: Configuração do Prisma ORM (`prisma init`), conexão com PostgreSQL e model `User`
  - [x] 1.3: Criação da migration inicial da tabela `users` e seed do usuário Gerente administrador
  - [x] 1.4: Implementação do filtro global `HttpExceptionFilter` (RFC 7807)
  - [x] 1.5: Implementação do `AuthModule` (login, validação de credenciais e emissão de JWT)
  - [x] 1.6: Implementação dos decorators `@CurrentUser()` e `@Roles()`, e dos guards `JwtAuthGuard` e `RolesGuard`
  - [x] 1.7: Implementação do `UsersModule` (DTOs com `class-validator`, Service e Controller para CRUD de operadores)
  - [x] 1.8: Testes de integração de autenticação e validação de bloqueio 403 para operadores
- **Plano de Execução Vinculado:** [PLANO-FASE-1-BACKEND.md](file:///home/ferreito/SGMS/docs/roadmap/backend/PLANO-FASE-1-BACKEND.md)

---

### Fase 2: Cadastros de Máquinas, Turnos & Alocação 1:1 com Trava ACID
- **Referência Hierárquica:** Fase 2 de [ROADMAP-GERAL.md](file:///home/ferreito/SGMS/docs/roadmap/ROADMAP-GERAL.md).
- **Requisitos Técnicos e de Negócio:**
  - `RF-03`: Gestão do parque de máquinas de sopro (`machines`) e status operacional.
  - `RF-04`: Cadastro e horários planejados de turnos (`shifts`).
  - `RF-05`: Alocação de operador na máquina por turno (`shift_allocations`).
  - `RN-01`: Exclusividade 1:1 de operador por máquina/turno ativo com bloqueio HTTP 409 Conflict.
  - `RN-08`: Restrição de operações apenas a máquinas com alocação `ACTIVE`.
- **Dependências Bloqueantes:** Fase 1 concluída (autenticação, guards e tabela `users`).
- **Checklist Técnico Sequencial:**
  - [x] 2.1: Migrations Prisma para `machines`, `shifts` e `shift_allocations` com índice único condicional
  - [x] 2.2: Implementação do `MachinesModule` (CRUD de máquinas e transições de `MachineStatus`)
  - [x] 2.3: Implementação do `ShiftsModule` (Cadastro de turnos com horários formatados `HH:mm`)
  - [x] 2.4: Implementação do `AllocationsModule` com transação interativa gerenciada (`$transaction`)
  - [x] 2.5: Verificação de concorrência com lock ou consulta transacional para impedir alocações ativas simultâneas
  - [x] 2.6: Rota para consulta da alocação corrente ativa do operador autenticado (`GET /api/allocations/current`)
  - [x] 2.7: Testes automatizados validando rejeição 409 em tentativas de alocação concorrente
- **Plano de Execução Vinculado:** [PLANO-FASE-2-BACKEND.md](file:///home/ferreito/SGMS/docs/roadmap/backend/PLANO-FASE-2-BACKEND.md)

---

### Fase 3: Apontamento de Produção, Paradas & Sincronização Idempotente
- **Referência Hierárquica:** Fase 3 de [ROADMAP-GERAL.md](file:///home/ferreito/SGMS/docs/roadmap/ROADMAP-GERAL.md).
- **Requisitos Técnicos e de Negócio:**
  - `RF-06`: Lançamento de produção com quantidade estritamente inteira positiva ($Q \ge 1$).
  - `RF-07`: Apontamento de paradas padronizadas (`DowntimeReason`) com cálculo de duração.
  - `RF-08`: Validação de timestamps retroativos com bloqueio de datas futuras (`timestamp <= serverNow`).
  - `RF-09` & `RNF-04`: Endpoint transacional de sincronização offline idempotente via `clientUuid`.
  - `RN-04`: Validação estrita de justificativa mínima (5 caracteres) quando o motivo for `OUTROS`.
- **Dependências Bloqueantes:** Fase 2 concluída (alocações ativas e tabelas operacionais).
- **Checklist Técnico Sequencial:**
  - [x] 3.1: Migrations Prisma para as tabelas `production_entries` e `downtime_records`
  - [x] 3.2: Implementação do `ProductionsModule` (DTOs com `IsPositive`, validação de alocação ativa e gravação)
  - [x] 3.3: Implementação do `DowntimesModule` (Início de parada em tempo real e resolução)
  - [x] 3.4: Apontamento retroativo e validação de justificativa para `OUTROS` (mín. 5 chars e null estrito)
  - [x] 3.5: Implementação do `SyncModule` (`POST /api/sync`) com processamento em lote transacional e descarte idempotente
  - [x] 3.6: Validação temporal estrita, tolerância de clock drift e bloqueio de timestamps futuros
  - [x] 3.7: Testes E2E de idempotência, auditoria Zero Fallback e homologação da Fase 3
- **Plano de Execução Vinculado:** [PLANO-FASE-3-BACKEND.md](file:///home/ferreito/SGMS/docs/roadmap/backend/PLANO-FASE-3-BACKEND.md)

---

### Fase 4: Fechamento de Turno, Agregações & Relatórios (CSV/PDFKit)
- **Referência Hierárquica:** Fase 4 de [ROADMAP-GERAL.md](file:///home/ferreito/SGMS/docs/roadmap/ROADMAP-GERAL.md).
- **Requisitos Técnicos e de Negócio:**
  - `RF-10`: Endpoints analíticos com agregações em tempo real para o dashboard gerencial.
  - `RF-11`: Emissão de relatórios estruturados nos formatos CSV e PDF.
  - `RN-06`: Fechamento formal de turno com transição para `CLOSED` e bloqueio de novas inserções.
  - `RNF-05`: Desempenho de consulta $\le 100\text{ms}$ e exportação de PDF em $\le 3\text{s}$.
- **Dependências Bloqueantes:** Fase 3 concluída (apontamentos e paradas consolidados no banco).
- **Checklist Técnico Sequencial:**
  - [x] 4.1: Endpoint de encerramento de turno (`POST /api/allocations/:id/close`) com transição da máquina para `IDLE`
  - [x] 4.2: Guard e validação impedindo apontamentos em alocações com status `CLOSED` (RN-06)
  - [x] 4.3: Implementação de queries de agregação analítica (tempo total parado, ritmo garrafas/hora e Pareto de motivos)
  - [x] 4.4: Implementação do `ReportsModule` com gerador de CSV via Fast-CSV (delimitador `;` e codificação UTF-8 com BOM)
  - [x] 4.5: Implementação do compilador de relatórios corporativos em PDF utilizando PDFKit com layout limpo
  - [x] 4.6: Endpoints de download binário (`GET /api/reports/csv` e `GET /api/reports/pdf`) com headers de streaming
  - [x] 4.7: Testes de performance garantindo geração do PDF em tempo $< 3\text{s}$ para 500 registros
- **Plano de Execução Vinculado:** [PLANO-FASE-4-BACKEND.md](file:///home/ferreito/SGMS/docs/roadmap/backend/PLANO-FASE-4-BACKEND.md)

---

### Fase 5: Pausa Planejada (`REFEICAO_INTERVALO`) & Segregação Estatística OEE
- **Referência Hierárquica:** Fase 5 de [ROADMAP-GERAL.md](file:///home/ferreito/SGMS/docs/roadmap/ROADMAP-GERAL.md).
- **Requisitos Técnicos e de Negócio:**
  - `RF-07`: Expansão do enum `DowntimeReason` com `REFEICAO_INTERVALO` no PostgreSQL/Prisma e dicionários de rótulos.
  - `RF-10`, `RF-11` & `RN-10`: Exclusão de `REFEICAO_INTERVALO` do Gráfico de Pareto de Gargalos e dedução do tempo de pausa planejada do Tempo Planejado do Turno ($T_{disp\_turno} = \max(0, T_{planejado\_turno} - T_{pausa\_planejada})$) nos KPIs de disponibilidade e linhas de relatório.
- **Dependências Bloqueantes:** Fase 4 concluída (`ReportsModule` e schema Prisma consolidados).
- **Checklist Técnico Sequencial:**
  - [x] 5.1: Atualização do `prisma/schema.prisma`, migration SQL para adicionar `REFEICAO_INTERVALO` ao enum `DowntimeReason` e atualização de `DOWNTIME_REASON_LABELS`
  - [x] 5.2: Refatoração de `ReportsService` (`getDashboardMetrics` e `getDetailedAllocationRows`) aplicando a segregação OEE (`RN-10`) e testes unitários/E2E
- **Plano de Execução Vinculado:** [PLANO-FASE-5-BACKEND.md](file:///home/ferreito/SGMS/docs/roadmap/backend/PLANO-FASE-5-BACKEND.md)

---

### Fase 6: Trava Física 1:1 de Máquina, Proteção de Inativação de Operador & Sync de Resolução de Parada
- **Referência Hierárquica:** Fase 6 de [ROADMAP-GERAL.md](file:///home/ferreito/SGMS/docs/roadmap/ROADMAP-GERAL.md) e [06-auditoria-bugs-e-inconsistencias.md](file:///home/ferreito/SGMS/docs/06-auditoria-bugs-e-inconsistencias.md).
- **Checklist Técnico Sequencial:**
  - [x] 6.1: Trava física 1:1 de máquina em `AllocationsService.create` (`BUG-03`) e proteção contra inativação de operador com alocação ativa em `UsersService.updateStatus` (`BUG-05`)
  - [x] 6.2: Suporte à resolução de parada `IN_PROGRESS` no `SyncService.processBatch` (`BUG-04`)
- **Plano de Execução Vinculado:** [PLANO-FASE-6-BACKEND.md](file:///home/ferreito/SGMS/docs/roadmap/backend/PLANO-FASE-6-BACKEND.md)

---

### Fase 7: Containerização Backend (`Dockerfile`), Orquestração `docker-compose.yml` & `README.md` Central
- **Referência Hierárquica:** Fase 7 de [ROADMAP-GERAL.md](file:///home/ferreito/SGMS/docs/roadmap/ROADMAP-GERAL.md) e [05-arquitetura.md](file:///home/ferreito/SGMS/docs/05-arquitetura.md).
- **Requisitos Técnicos e de Negócio:**
  - `RNF-01`: Validação estrita de variáveis de ambiente (`DATABASE_URL`, `JWT_SECRET`, `POSTGRES_PASSWORD`) sem valores padrão inseguros em produção (Zero Fallback).
  - `RNF-02`: Execução 100% on-premise em servidor Linux local com reinício automático pós-queda de energia (`restart: unless-stopped`).
  - `RNF-07`: Isolamento de rede dos containers (`sgms-network`), mantendo o PostgreSQL 16 e a porta `3001` do NestJS isolados internamente e expondo na LAN apenas o proxy reverso Nginx na porta `80`.
- **Dependências Bloqueantes:** Fases 1 a 6 do Backend concluídas.
- **Checklist Técnico Sequencial:**
  - [x] 7.1: Criação de `backend/Dockerfile` (multi-stage Node 20 Alpine com geração do Prisma Client, compilação `nest build` e entrypoint executando `npx prisma migrate deploy && node dist/main.js`) e `backend/.dockerignore`
  - [x] 7.2: Criação de `docker-compose.yml` e `.env.production.example` na raiz do repositório orquestrando `sgms-db` (PostgreSQL 16 Alpine com volume nomeado e `healthcheck`), `sgms-backend` e `sgms-web`
  - [x] 7.3: Criação do `README.md` central na raiz do projeto documentando arquitetura, execução local (PC/WSL2 + celular na LAN), implantação em produção no Ubuntu Server 24.04 LTS (Docker Compose, Netplan IP Fixo e `avahi-daemon` `http://sgms.local`) e comandos de backup/restore
- **Plano de Execução Vinculado:** [PLANO-FASE-7-BACKEND.md](file:///home/ferreito/SGMS/docs/roadmap/backend/PLANO-FASE-7-BACKEND.md)
