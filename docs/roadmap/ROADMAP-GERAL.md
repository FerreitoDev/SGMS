# SGMS — Roadmap Geral Integrado (Nível 1)

> **Status Geral do Projeto:** 🟢 Fase 6 Concluída (Fases 1 a 6 Concluídas)  
> **Fonte da Verdade:** [00-visao-e-post-mortems.md](file:///home/ferreito/SGMS/docs/00-visao-e-post-mortems.md) a [06-auditoria-bugs-e-inconsistencias.md](file:///home/ferreito/SGMS/docs/06-auditoria-bugs-e-inconsistencias.md)  
> **Última Atualização:** 2026-10-28  

---

## 1. Visão Macro de Fases do Produto

| Fase | Título da Fase | Módulos Envolvidos | Status | Requisitos Cobertos |
| :---: | :--- | :--- | :---: | :--- |
| **1** | Fundação, Autenticação e Perfis (RBAC) | Backend + Frontend | 🟢 Concluída | RF-01, RF-02, RNF-01, RNF-02, RNF-06, RNF-07 |
| **2** | Cadastros Operacionais e Alocação de Turno | Backend + Frontend | 🟢 Concluída | RF-03, RF-04, RF-05, RNF-01, RNF-02, RNF-03 |
| **3** | Apontamentos Touch e Sincronização Offline | Backend + Frontend | 🟢 Concluída | RF-06, RF-07, RF-08, RF-09, RNF-03, RNF-04 |
| **4** | Dashboard de Gargalos e Relatórios Gerenciais | Backend + Frontend | 🟢 Concluída | RF-10, RF-11, RNF-01, RNF-05 |
| **5** | Refinamento de UX de Paradas e Pausa Planejada (OEE) | Backend + Frontend | 🟢 Concluída | RF-07, RF-08, RF-10, RF-11, RN-09, RN-10, RNF-01, RNF-03 |
| **6** | Resolução de Bugs Críticos (LAN HTTP, Alocação Física 1:1, Últimos Lançamentos e Sync de Paradas) | Backend + Frontend | 🟢 Concluída | BUG-01 a BUG-06, RN-01, RF-02, RF-05, RF-06, RF-07, RF-09, RNF-01, RNF-02 |

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
  - [x] Dashboard gerencial para desktop com cartões de status e gráficos limpos (shadcn/ui + Recharts)
  - [x] Filtros por período, máquina, turno e operador na interface de relatórios
- **Critérios de Conclusão da Fase:**
  - Gerente consegue visualizar em tela o gráfico de Pareto dos principais gargalos da semana.
  - Exportação de relatório em PDF de até 500 registros gerada e baixada no navegador em menos de 3 segundos.
  - Alocação com status `CLOSED` bloqueia novos apontamentos de operadores com HTTP 403.

---

### Fase 5: Refinamento de UX de Paradas, Input Numérico Puro, RBAC de Rotas e Pausa Planejada (OEE)
- **Objetivo Estratégico:** Eliminar redundâncias visuais e armadilhas de digitação no Console Operacional (unificando o acionamento de paradas em um único gatilho com `Sheet`, removendo botões de adição rápida e setas de incremento no input de produção), corrigir o isolamento de rotas no login entre `OPERADOR` e `GERENTE`, travar a edição de data/hora quando em modo **Tempo Real (Agora)** (RN-09) e introduzir a pausa planejada `REFEICAO_INTERVALO` com segregação estatística OEE (RN-10).
- **Requisitos Associados:**
  - `RF-01`: Isolamento estrito de rotas por perfil (`OPERADOR` $\rightarrow$ `/chao-de-fabrica/*`, `GERENTE` $\rightarrow$ `/admin/*`), impedindo que o Gerente caia em telas de Operador ao trocar de conta.
  - `RF-06` & `RNF-03`: Remoção dos botões de adição rápida (`+50`, `+100`, `+250`, `+500`) e ocultação das setas nativas (`spinners`) no input de quantidade de garrafas, além da remoção do botão redundante `"Lançar Parada Ocorrida Anteriormente (Retroativa)"`.
  - `RF-07`: Inclusão de `REFEICAO_INTERVALO` no enum `DowntimeReason` (Prisma, Backend e Frontend) e unificação do botão de parada.
  - `RF-08` & `RN-09`: Bloqueio de edição do timestamp de início na aba **Tempo Real (Agora)**, mantendo edição livre de início e término apenas na aba **Lançamento Retroativo**.
  - `RF-10`, `RF-11` & `RN-10`: Exclusão de `REFEICAO_INTERVALO` do ranking/gráfico de Pareto de Gargalos e dedução do tempo de pausa planejada do Tempo Planejado do Turno ($T_{disp\_turno} = T_{planejado\_turno} - T_{pausa\_planejada}$) nos KPIs e relatórios.
- **Checklist Macro de Entregas:**
  - [x] Migration Prisma adicionando `REFEICAO_INTERVALO` ao enum `DowntimeReason` no PostgreSQL
  - [x] Atualização das queries analíticas de Dashboard e Relatórios no Backend (exclusão de `REFEICAO_INTERVALO` do Pareto e ajuste da fórmula de Disponibilidade OEE)
  - [x] Remoção do botão secundário redundante `"Lançar Parada Ocorrida Anteriormente (Retroativa)"` no Console Operacional do Frontend
  - [x] Travamento do horário de início na aba **Tempo Real (Agora)** do `DowntimeModal` (RN-09) e inclusão da opção `"Refeição / Intervalo"` (`REFEICAO_INTERVALO`)
  - [x] Remoção dos botões de adição rápida (`+50`, `+100`, `+250`, `+500`) e das setas (`spinners`) do input numérico no `ProductionDrawer`
  - [x] Correção do roteamento RBAC (`AppRoutes`, `ProtectedRoute` e `LoginPage`) para impedir que o `GERENTE` seja redirecionado para telas de `OPERADOR` após troca de conta
- **Critérios de Conclusão da Fase:**
  - Console Operacional apresenta apenas o botão `"Registrar Parada de Linha"` para acionamento de paradas, e o `ProductionDrawer` exibe apenas o input numérico limpo (sem setas e sem botões `+50`/`+100`).
  - Ao fazer logout da conta de Operador e entrar na conta de Gerente, o sistema redireciona diretamente para `/admin/dashboard` e bloqueia acesso de Gerente às rotas `/chao-de-fabrica/*`.
  - Na aba **Tempo Real (Agora)**, o operador não consegue editar a data/hora de início; na aba **Lançamento Retroativo**, os campos de Início e Término são editáveis.
  - Paradas lançadas com motivo `REFEICAO_INTERVALO` param a máquina normalmente, mas não aparecem como gargalo no Gráfico de Pareto e não reduzem a disponibilidade operacional ($D$) do turno.
  - Compilação (`npm run build`) e testes unitários/integração passando no Backend e Frontend.

---

### Fase 6: Resolução de Bugs Críticos (LAN HTTP, Alocação Física 1:1, Últimos Lançamentos e Sync de Paradas)
- **Objetivo Estratégico:** Saneamento integral dos 6 problemas diagnosticados em [06-auditoria-bugs-e-inconsistencias.md](file:///home/ferreito/SGMS/docs/06-auditoria-bugs-e-inconsistencias.md): geração de UUID v4 compatível com rede local LAN HTTP sem HTTPS (`BUG-01`), ordenação decrescente e exibição de buffer local em `"ÚLTIMOS LANÇAMENTOS DO TURNO"` (`BUG-02`), bloqueio de alocação concorrente em máquina `STOPPED` ou em turnos distintos (`BUG-03`), sincronização offline de resolução de parada (`BUG-04`), bloqueio de inativação de operador com alocação ativa (`BUG-05`) e eliminação de fallbacks no Dashboard/Alocação (`BUG-06`).
- **Checklist Macro de Entregas:**
  - [x] Gerador UUID v4 via `crypto.getRandomValues` em `OfflineStorage.generateUuid` para suporte a `http://<IP_DA_LAN>:5173` (`BUG-01`)
  - [x] Ordenação decrescente e listagem de pendentes offline em `"ÚLTIMOS LANÇAMENTOS DO TURNO"` no Console Operacional (`BUG-02`)
  - [x] Bloqueio de segunda alocação `ACTIVE` na mesma máquina física no Backend (`AllocationsService.create`) e bloqueio de seleção de máquina `STOPPED` no Frontend (`MachineCard` / `AllocationPage`) (`BUG-03`)
  - [x] Suporte à resolução de parada `IN_PROGRESS` no `SyncService.processBatch` e correção de `handleResolveDowntime` (`BUG-04`)
  - [x] Proteção contra inativação de operador com alocação `ACTIVE` em `UsersService.updateStatus` (`BUG-05`)
  - [x] Remoção do texto `'Modelo Padrão'` no Dashboard, distinção de erro 409 na Alocação e feedback inline no `DowntimeModal` (`BUG-06`)
