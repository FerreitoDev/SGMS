# SGMS — Roadmap Geral Integrado (Nível 1)

> **Status Geral do Projeto:** 🟡 Planejamento Ativo (Fase 1 em Preparação)  
> **Fonte da Verdade:** [00-visao-e-post-mortems.md](file:///home/ferreito/SGMS/docs/00-visao-e-post-mortems.md) a [05-arquitetura.md](file:///home/ferreito/SGMS/docs/05-arquitetura.md)  
> **Última Atualização:** 2026-10-19  

---

## 1. Visão Macro de Fases do Produto

| Fase | Título da Fase | Módulos Envolvidos | Status | Requisitos Cobertos |
| :---: | :--- | :--- | :---: | :--- |
| **1** | Fundação, Autenticação e Perfis (RBAC) | Backend + Frontend | 🟢 Concluída | RF-01, RF-02, RNF-01, RNF-02, RNF-06, RNF-07 |
| **2** | Cadastros Operacionais e Alocação de Turno | Backend + Frontend | 🟢 Concluída | RF-03, RF-04, RF-05, RNF-01, RNF-02, RNF-03 |
| **3** | Apontamentos Touch e Sincronização Offline | Backend + Frontend | 🟢 Concluída | RF-06, RF-07, RF-08, RF-09, RNF-03, RNF-04 |
| **4** | Dashboard de Gargalos e Relatórios Gerenciais | Backend + Frontend | 🟡 Em Andamento | RF-10, RF-11, RNF-01, RNF-05 |

---

## 2. Detalhamento das Fases

### Fase 1: Fundação, Autenticação e Perfis (RBAC)
- **Objetivo Estratégico:** Estabelecer a infraestrutura de monorepo/workspace na rede local, schema Prisma inicial no PostgreSQL, autenticação JWT com perfis (`GERENTE` e `OPERADOR`), CRUD de contas de operadores e casca visual responsiva com shadcn/ui.
- **Requisitos Associados:**
  - `RF-01`: Autenticação e emissão de tokens JWT com controle de perfis.
  - `RF-02`: Gerenciamento e desativação de contas de operadores pelo Gerente.
  - `RNF-01`: Integridade estrita de dados e respostas de erro RFC 7807.
  - `RNF-02`: Execução estritamente on-premise em rede local (LAN).
  - `RNF-06`: Estrutura PWA (Manifest e Service Worker base) no frontend.
  - `RNF-07`: Criptografia de senhas com Argon2/Bcrypt e Guards de rota.
- **Checklist Macro de Entregas:**
  - [x] Inicialização dos projetos `backend` (NestJS 10 + TypeScript) e `frontend` (React 18 + Vite + Tailwind + shadcn/ui)
  - [x] Configuração do Prisma ORM e migration da tabela `users`
  - [x] Implementação do módulo `AuthModule` (login, hash, guards e `@CurrentUser()`)
  - [x] Implementação do módulo `UsersModule` (CRUD de operadores exclusivo para Gerente)
  - [x] Filtro global de exceções RFC 7807 (`HttpExceptionFilter`)
  - [x] Tela de Login corporativa e gestão de sessão com persistência de token
  - [x] Painel inicial com redirecionamento contextual por papel (`GERENTE` $\rightarrow$ Admin, `OPERADOR` $\rightarrow$ Chão de Fábrica)
- **Critérios de Conclusão da Fase:**
  - Login operacional com rejeição de credenciais inválidas em formato RFC 7807.
  - Gerente consegue cadastrar nova conta de operador e desativar contas existentes.
  - Guards bloqueiam acesso de operadores às rotas administrativas com HTTP 403.
  - Build sem erros (`npm run build`) no backend e no frontend.

---

### Fase 2: Cadastros Operacionais e Alocação de Turno
- **Objetivo Estratégico:** Habilitar o cadastro e controle do parque de sopradoras e turnos de trabalho, assegurando a regra inegociável de exclusividade 1:1 de operador por máquina no turno ativo.
- **Requisitos Associados:**
  - `RF-03`: Cadastro e controle de status das sopradoras (`machines`).
  - `RF-04`: Cadastro e configuração de horários de turnos de trabalho (`shifts`).
  - `RF-05`: Alocação exclusiva de máquina por turno com validação de unicidade (`shift_allocations`).
  - `RNF-03`: Ergonomia de toque adaptada para telas móveis de seleção rápida.
- **Checklist Macro de Entregas:**
  - [x] Migrations das tabelas `machines`, `shifts` e `shift_allocations` com constraint condicional
  - [x] Módulo `MachinesModule` (CRUD de sopradoras e transições de status)
  - [x] Módulo `ShiftsModule` (Cadastro e listagem de turnos fabris)
  - [x] Módulo `AllocationsModule` com validação de concorrência e trava 1:1 (RN-01)
  - [x] Telas administrativas de gestão de máquinas e turnos para desktop
  - [x] Interface touch para o operador selecionar a máquina e turno no início da jornada
- **Critérios de Conclusão da Fase:**
  - Tentativa de dois operadores assumirem a mesma máquina no mesmo turno bloqueada com HTTP 409.
  - Máquina transita automaticamente para `RUNNING` ao ser alocada e `IDLE` quando desimpedida.
  - Layout testado e validado em dimensões móveis de smartphone/tablet.

---

### Fase 3: Apontamentos Touch e Sincronização Offline
- **Objetivo Estratégico:** Substituir integralmente o caderno físico de anotações no chão de fábrica, permitindo lançamentos horários de garrafas sopradas e paradas (tempo real ou retroativas) com total retenção de dados em quedas de rede/energia via IndexedDB.
- **Requisitos Associados:**
  - `RF-06`: Apontamento de volume de garrafas sopradas (inteiro positivo).
  - `RF-07`: Registro de paradas padronizadas com justificativa obrigatória se `OUTROS`.
  - `RF-08`: Suporte a lançamentos com timestamps retroativos editáveis.
  - `RF-09`: Fila local em IndexedDB com idempotência por `clientUuid`.
  - `RNF-04`: Idempotência transacional de sincronização no backend.
- **Checklist Macro de Entregas:**
  - [x] Migrations das tabelas `production_entries` e `downtime_records` com chaves `clientUuid` únicas
  - [x] Módulo `ProductionsModule` (lançamentos de produção com validação $Q > 0$)
  - [x] Módulo `DowntimesModule` (paradas em tempo real e retroativas com validação de justificativa)
  - [x] Módulo `SyncModule` (endpoint transacional idempotente `POST /api/sync`)
  - [x] Camada de armazenamento cliente no IndexedDB (tabela local `pending_events`)
  - [x] Gaveta touch rápida no frontend com teclado numérico nativo e alvos $\ge 44\text{px}$
  - [x] Modal de registro de parada com cronômetro em tempo real e modo retroativo
  - [x] Hook de sincronização automática com feedback visual de status de rede
- **Critérios de Conclusão da Fase:**
  - Apontamento gravado com dispositivo desconectado da rede local permanece no IndexedDB e sincroniza automaticamente ao reconectar.
  - Reenvio acidental do mesmo lote offline não gera duplicidade de garrafas ou paradas no banco.
  - Parada com motivo `OUTROS` rejeitada na fronteira caso a justificativa possua menos de 5 caracteres.

---

### Fase 4: Dashboard de Gargalos e Relatórios Gerenciais
- **Objetivo Estratégico:** Fornecer visibilidade imediata dos gargalos operacionais da linha de sopro para o Gerente de Produção, permitindo encerramento formal de turnos e exportação de relatórios em CSV e PDF.
- **Requisitos Associados:**
  - `RF-10`: Dashboard de monitoramento com status das máquinas, volume do turno e Pareto de paradas.
  - `RF-11`: Extração de relatórios gerenciais estruturados em CSV e PDF.
  - `RNF-05`: Desempenho de consulta $\le 100\text{ms}$ e exportação de PDF em $\le 3\text{s}$.
- **Checklist Macro de Entregas:**
  - [x] Rota de fechamento formal de turno (`POST /api/allocations/:id/close`) com congelamento de inserções (RN-06)
  - [x] Consultas analíticas agregadas no backend (disponibilidade operacional, ritmo garrafas/hora e Pareto)
  - [x] Módulo `ReportsModule` com geração em streaming de CSV (delimitador `;`, UTF-8 BOM)
  - [x] Compilador de relatórios corporativos em PDF utilizando PDFKit
  - [ ] Dashboard gerencial para desktop com cartões de status e gráficos limpos (shadcn/ui + Recharts)
  - [ ] Filtros por período, máquina, turno e operador na interface de relatórios
- **Critérios de Conclusão da Fase:**
  - Gerente consegue visualizar em tela o gráfico de Pareto dos principais gargalos da semana.
  - Exportação de relatório em PDF de até 500 registros gerada e baixada no navegador em menos de 3 segundos.
  - Alocação com status `CLOSED` bloqueia novos apontamentos de operadores com HTTP 403.
