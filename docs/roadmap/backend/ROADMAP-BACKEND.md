# SGMS — Roadmap Técnico: Backend (Nível 2)

> **Fase Geral Correspondente:** [ROADMAP-GERAL.md](file:///home/ferreito/SGMS/docs/roadmap/ROADMAP-GERAL.md)  
> **Status:** 🟡 Planejamento Ativo  
> **Última Atualização:** 2026-10-19  

---

## 1. Matriz de Fases e Planos Vinculados

| Fase Setorial | Título da Entrega Técnica | Plano de Execução Vinculado | Status |
| :---: | :--- | :--- | :---: |
| **Fase 1** | Fundação, Prisma, Autenticação JWT & Gestão de Usuários | [PLANO-FASE-1-BACKEND.md](file:///home/ferreito/SGMS/docs/roadmap/backend/PLANO-FASE-1-BACKEND.md) | ⚪ A Iniciar |
| **Fase 2** | Cadastros de Máquinas, Turnos & Alocação 1:1 com Trava ACID | [PLANO-FASE-2-BACKEND.md](file:///home/ferreito/SGMS/docs/roadmap/backend/PLANO-FASE-2-BACKEND.md) | ⚪ A Iniciar |
| **Fase 3** | Apontamento de Produção, Paradas & Sincronização Idempotente | [PLANO-FASE-3-BACKEND.md](file:///home/ferreito/SGMS/docs/roadmap/backend/PLANO-FASE-3-BACKEND.md) | ⚪ A Iniciar |
| **Fase 4** | Fechamento de Turno, Agregações & Relatórios (CSV/PDFKit) | [PLANO-FASE-4-BACKEND.md](file:///home/ferreito/SGMS/docs/roadmap/backend/PLANO-FASE-4-BACKEND.md) | ⚪ A Iniciar |

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
  - [ ] 1.8: Testes de integração de autenticação e validação de bloqueio 403 para operadores
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
  - [ ] 2.1: Migrations Prisma para `machines`, `shifts` e `shift_allocations` com índice único condicional
  - [ ] 2.2: Implementação do `MachinesModule` (CRUD de máquinas e transições de `MachineStatus`)
  - [ ] 2.3: Implementação do `ShiftsModule` (Cadastro de turnos com horários formatados `HH:mm`)
  - [ ] 2.4: Implementação do `AllocationsModule` com transação interativa gerenciada (`$transaction`)
  - [ ] 2.5: Verificação de concorrência com lock ou consulta transacional para impedir alocações ativas simultâneas
  - [ ] 2.6: Rota para consulta da alocação corrente ativa do operador autenticado (`GET /api/allocations/current`)
  - [ ] 2.7: Testes automatizados validando rejeição 409 em tentativas de alocação concorrente
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
  - [ ] 3.1: Migrations Prisma para as tabelas `production_entries` e `downtime_records`
  - [ ] 3.2: Implementação do `ProductionsModule` (DTOs com `IsPositive`, validação de alocação ativa e gravação)
  - [ ] 3.3: Implementação do `DowntimesModule` (Início de parada em tempo real, resolução e lançamento retroativo)
  - [ ] 3.4: Validador customizado/Pipe para forçar `justification` obrigatória se `reason == OUTROS`
  - [ ] 3.5: Implementação do `SyncModule` (`POST /api/sync`) com processamento em lote transacional
  - [ ] 3.6: Mecanismo de descarte idempotente de `clientUuid` pré-existente sem alterar dados
  - [ ] 3.7: Testes de unidade e integração provando idempotência e rejeição de horários futuros
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
  - [ ] 4.1: Endpoint de encerramento de turno (`POST /api/allocations/:id/close`) com transição da máquina para `IDLE`
  - [ ] 4.2: Guard e validação impedindo apontamentos em alocações com status `CLOSED` (RN-06)
  - [ ] 4.3: Implementação de queries de agregação analítica (tempo total parado, ritmo garrafas/hora e Pareto de motivos)
  - [ ] 4.4: Implementação do `ReportsModule` com gerador de CSV via Fast-CSV (delimitador `;` e codificação UTF-8 com BOM)
  - [ ] 4.5: Implementação do compilador de relatórios corporativos em PDF utilizando PDFKit com layout limpo
  - [ ] 4.6: Endpoints de download binário (`GET /api/reports/csv` e `GET /api/reports/pdf`) com headers de streaming
  - [ ] 4.7: Testes de performance garantindo geração do PDF em tempo $< 3\text{s}$ para 500 registros
- **Plano de Execução Vinculado:** [PLANO-FASE-4-BACKEND.md](file:///home/ferreito/SGMS/docs/roadmap/backend/PLANO-FASE-4-BACKEND.md)
