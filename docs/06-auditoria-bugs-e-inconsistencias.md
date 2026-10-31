# SGMS — Auditoria de Bugs, Inconsistências e Plano de Resolução (Fase 6)

> **Projeto:** Sistema de Gestão de Máquinas de Sopro (SGMS) — GEPF Agroindústria  
> **Documento:** 06 — Diagnóstico Causal de Bugs, Inconsistências de Domínio e Plano de Correção  
> **Status:** 🟡 Auditado — Aguardando Execução (Fase 6)  
> **Data:** 2026-10-28  
> **Referências SSOT:** [01-requisitos.md](file:///home/ferreito/SGMS/docs/01-requisitos.md) | [02-regras-de-negocio.md](file:///home/ferreito/SGMS/docs/02-regras-de-negocio.md) | [05-arquitetura.md](file:///home/ferreito/SGMS/docs/05-arquitetura.md)

---

## 1. Matriz Resumo de Problemas Identificados

| ID | Severidade | Título do Problema | Módulo Afetado | Regra / Requisito Violado | Status |
| :---: | :---: | :--- | :---: | :---: | :---: |
| **BUG-01** | 🔴 Crítica | `crypto.randomUUID()` falha em acesso via IP da Rede Local (LAN HTTP) | Frontend | `RNF-02`, `RF-09` | 🟢 Concluído |
| **BUG-02** | 🔴 Crítica | `"ÚLTIMOS LANÇAMENTOS DO TURNO"` oculta novos apontamentos a partir do 6º registro e ignora itens do buffer offline | Frontend + Backend | `RF-06`, `RF-09` | 🟢 Concluído |
| **BUG-03** | 🔴 Crítica | Máquina `STOPPED` ou em turno/data distinta aceita segunda alocação `ACTIVE` simultânea | Backend + Frontend | `RN-01`, `RF-05` | 🟢 Concluído |
| **BUG-04** | 🔴 Crítica | Resolução de Parada Offline (`Retomar Produção`) incompatível com `SyncService.processBatch` | Backend + Frontend | `RF-07`, `RF-09`, `RNF-04` | ⚪ Pendente |
| **BUG-05** | 🟠 Alta | Inativação de Operador com alocação `ACTIVE` deixa máquina presa em `RUNNING` (alocação órfã) | Backend | `RF-02`, `RN-01` | 🟢 Concluído |
| **BUG-06** | 🟡 Média | Violação de Zero Fallback (`'Modelo Padrão'`), falso erro 409 na Alocação e falta de erro inline no `DowntimeModal` | Frontend | `RNF-01`, Zero Fallback | 🟢 Concluído |

---

## 2. Diagnóstico Causal Detalhado por Problema

---

### 🔴 BUG-01: Quebra de `crypto.randomUUID()` em Contexto HTTP de Rede Local (LAN)

- **Arquivos Afetados:**
  - [`frontend/src/lib/offline-storage.ts`](file:///home/ferreito/SGMS/frontend/src/lib/offline-storage.ts#L123-L125)
  - [`frontend/src/components/production/production-drawer.tsx`](file:///home/ferreito/SGMS/frontend/src/components/production/production-drawer.tsx#L62)
  - [`frontend/src/components/downtime/downtime-modal.tsx`](file:///home/ferreito/SGMS/frontend/src/components/downtime/downtime-modal.tsx#L106)
- **Causa-Raiz:**
  - Pela especificação W3C Web Crypto API, o método `crypto.randomUUID()` possui a restrição `[SecureContext]`, sendo disponibilizado pelos navegadores exclusivamente em origens `https://` ou `http://localhost` (`127.0.0.1`).
  - Como o SGMS opera em **rede local LAN HTTP** (`http://192.168.x.x:5173`, conforme premissa arquitetural `RNF-02`), ao abrir o sistema em um tablet, celular ou computador pelo endereço IP da rede local, `crypto.randomUUID` é `undefined`.
  - No instante em que o operador clica em **Confirmar Apontamento** ou **Confirmar Parada**, a chamada `OfflineStorage.generateUuid()` lança `TypeError: crypto.randomUUID is not a function`, abortando a operação.
- **Solução Técnica:**
  - Em `OfflineStorage.generateUuid()`, utilizar `crypto.randomUUID()` apenas quando disponível (`typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'`) e, em contextos LAN HTTP, gerar o UUID v4 RFC 4122 criptograficamente seguro via `crypto.getRandomValues(new Uint8Array(16))` (que não possui restrição `[SecureContext]` e funciona em qualquer origem HTTP).

---

### 🔴 BUG-02: `"ÚLTIMOS LANÇAMENTOS DO TURNO"` Oculta Novos Apontamentos a partir do 6º Registro

- **Arquivos Afetados:**
  - [`frontend/src/pages/operator/operator-console-page.tsx`](file:///home/ferreito/SGMS/frontend/src/pages/operator/operator-console-page.tsx#L356-L383)
  - [`backend/src/modules/productions/productions.service.ts`](file:///home/ferreito/SGMS/backend/src/modules/productions/productions.service.ts#L114-L117)
- **Causa-Raiz:**
  1. `ProductionsService.findByAllocation` consulta `productionEntry.findMany` com `orderBy: { timestamp: 'asc' }` (do mais antigo para o mais recente).
  2. No `OperatorConsolePage`, o card `"ÚLTIMOS LANÇAMENTOS DO TURNO"` renderiza `productions.slice(0, 5)`. Como a lista está em ordem crescente, `.slice(0, 5)` pega sempre os **5 primeiros apontamentos do turno** (os mais antigos). A partir do 6º apontamento (caso da `SOPRO-01`, que já inicia com 5 registros do seed), nenhum novo apontamento aparece na lista de últimos lançamentos.
  3. Adicionalmente, quando `productions.length === 0` e há apontamentos pendentes no buffer offline (`pendingProductionsQty > 0`), a condicional sai do estado vazio, mas renderiza uma lista em branco por iterar apenas sobre `productions`.
- **Solução Técnica:**
  - Ordenar `entries` de forma decrescente por carimbo de tempo (`timestamp` mais recente no topo) para exibição no card `"ÚLTIMOS LANÇAMENTOS DO TURNO"`, além de exibir na lista os eventos `PENDING` de produção do `IndexedDB` pertencentes à alocação ativa com badge indicativo de sincronização pendente.

---

### 🔴 BUG-03: Violação de Exclusividade Física da Máquina (`RN-01`) em Status `STOPPED` ou Turnos Distintos

- **Arquivos Afetados:**
  - [`backend/src/modules/allocations/allocations.service.ts`](file:///home/ferreito/SGMS/backend/src/modules/allocations/allocations.service.ts#L50-L105)
  - [`frontend/src/components/machines/machine-card.tsx`](file:///home/ferreito/SGMS/frontend/src/components/machines/machine-card.tsx#L20-L23)
  - [`frontend/src/pages/operator/allocation-page.tsx`](file:///home/ferreito/SGMS/frontend/src/pages/operator/allocation-page.tsx#L281)
- **Causa-Raiz:**
  1. No backend (`AllocationsService.create`), a busca por alocação ativa na máquina filtra por `{ machineId: dto.machineId, shiftId: dto.shiftId, shiftDate, status: ShiftAllocationStatus.ACTIVE }`. Se o `operador1` estiver com uma alocação `ACTIVE` aberta na `SOPRO-01` (ex: no `Turno 1` ou data anterior ainda não encerrada), o `operador2` consegue alocar a mesma `SOPRO-01` selecionando o `Turno 2`, resultando em **duas alocações `ACTIVE` simultâneas na mesma máquina física**.
  2. No frontend (`MachineCard` e `AllocationPage`), a disponibilidade é avaliada como `machine.isActive && machine.status !== 'INACTIVE' && machine.status !== 'RUNNING'`. Quando uma máquina está em status **`STOPPED`** (porque o operador alocado nela registrou uma parada em andamento), o card permanece clicável como disponível na tela de Alocação, permitindo que outro operador a assuma e sobrescreva seu status para `RUNNING`.
- **Solução Técnica:**
  - No backend (`AllocationsService.create`), verificar se existe **qualquer** alocação `ACTIVE` vinculada ao `machineId` (`where: { machineId: dto.machineId, status: ShiftAllocationStatus.ACTIVE }`) ou se `machine.status !== MachineStatus.IDLE`, lançando `ConflictException (409 MACHINE_ALREADY_ALLOCATED)`.
  - No frontend (`MachineCard` e contador de `AllocationPage`), restringir `isAvailable` estritamente a `machine.isActive && machine.status === 'IDLE'`, exibindo o badge `"Em Parada (Em Uso)"` e bloqueando seleção quando `machine.status === 'STOPPED'`.

---

### 🔴 BUG-04: Resolução de Parada Offline (`Retomar Produção`) Incompatível com `SyncService.processBatch`

- **Arquivos Afetados:**
  - [`frontend/src/pages/operator/operator-console-page.tsx`](file:///home/ferreito/SGMS/frontend/src/pages/operator/operator-console-page.tsx#L157-L184)
  - [`backend/src/modules/sync/sync.service.ts`](file:///home/ferreito/SGMS/backend/src/modules/sync/sync.service.ts#L133-L304)
- **Causa-Raiz:**
  1. Quando o operador clica em `"Retomar Produção"` sem conexão com o servidor, `OperatorConsolePage.handleResolveDowntime` grava no `IndexedDB` um evento `type: 'DOWNTIME'` com `payload: { endTime: resolvedAt, allocationId }` (sem `reason`, sem `startTime` e sem `downtimeId`).
  2. Ao restabelecer a conexão, `SyncService.processBatch` exige `reason` e `startTime` em todo evento `DOWNTIME` e sempre executa `tx.downtimeRecord.create(...)`. Consequentemente, a resolução offline falha com `HTTP 400 INVALID_DOWNTIME_REASON` e a parada `IN_PROGRESS` nunca é resolvida no banco.
  3. Além disso, o bloco `catch` de `handleResolveDowntime` engole erros de domínio (`HTTP 4xx`) como se fossem falhas de rede offline.
- **Solução Técnica:**
  - Em `OperatorConsolePage.handleResolveDowntime`: distinguir erros de negócio (`ProblemDetailsError` com `status > 0`) de falha de rede (`status === 0`). No modo offline, gravar no payload os dados completos da parada ativa (`downtimeId: activeDowntime.id`, `allocationId: activeDowntime.allocationId`, `reason: activeDowntime.reason`, `justification: activeDowntime.justification`, `startTime: activeDowntime.startTime`, `endTime: resolvedAt`).
  - Em `SyncService.processBatch`: quando um evento `DOWNTIME` trouxer `endTime` e já existir uma parada `IN_PROGRESS` naquela alocação (ou `downtimeId` correspondente), atualizar a parada existente para `RESOLVED` (calculando `durationMinutes`) e reverter o status da máquina para `RUNNING`.

---

### 🟠 BUG-05: Inativação de Operador com Alocação `ACTIVE` Deixa Máquina Órfã

- **Arquivos Afetados:**
  - [`backend/src/modules/users/users.service.ts`](file:///home/ferreito/SGMS/backend/src/modules/users/users.service.ts#L87-L103)
- **Causa-Raiz:**
  - Diferente de `MachinesService` (`MACHINE_HAS_ACTIVE_ALLOCATION`) e `ShiftsService` (`SHIFT_HAS_ACTIVE_ALLOCATION`), o método `UsersService.updateStatus` não verifica se o operador possui uma alocação `ACTIVE` antes de inativá-lo (`dto.isActive === false`), nem impede a inativação de contas com perfil `GERENTE`.
  - Se um operador alocado é inativado, seu token JWT passa a ser recusado imediatamente pela `JwtStrategy` (`401 Unauthorized`) e a sopradora permanece travada em `RUNNING` com uma alocação `ACTIVE` órfã.
- **Solução Técnica:**
  - Em `UsersService.updateStatus`: validar que o usuário alvo possui perfil `OPERADOR` e, quando `dto.isActive === false`, verificar se existe `shiftAllocation` com `status: ShiftAllocationStatus.ACTIVE` para aquele `operatorId`. Se existir, lançar `ConflictException` (`HTTP 409 USER_HAS_ACTIVE_ALLOCATION`).

---

### 🟡 BUG-06: Violação de Zero Fallback no Dashboard, Falso Erro 409 na Alocação e Feedback Inline em `DowntimeModal`

- **Arquivos Afetados:**
  - [`frontend/src/pages/admin/dashboard-page.tsx`](file:///home/ferreito/SGMS/frontend/src/pages/admin/dashboard-page.tsx#L353)
  - [`frontend/src/pages/operator/allocation-page.tsx`](file:///home/ferreito/SGMS/frontend/src/pages/operator/allocation-page.tsx#L118-L138)
  - [`frontend/src/components/downtime/downtime-modal.tsx`](file:///home/ferreito/SGMS/frontend/src/components/downtime/downtime-modal.tsx#L154-L231)
- **Causa-Raiz:**
  1. Em `ManagerDashboardPage` (linha 353), máquinas com `model: null` (como a `SOPRO-04`) são exibidas com o texto inventado `'Modelo Padrão'`, violando a Diretriz Global de Zero Fallback.
  2. Em `AllocationPage.handleConfirmAllocation` (linhas 118-138), qualquer exceção capturada no `catch` (mesmo erro de rede ou `OPERATOR_ALREADY_ALLOCATED`) altera localmente o card da máquina selecionada para `status: 'RUNNING'` e exibe o título fixo `'Máquina já alocada por outro operador.'`.
  3. Em `DowntimeModal`, quando a API retorna um erro de domínio (`HTTP 4xx/409/422`), o erro é disparado apenas via `toast.error` sem exibir um alerta inline dentro do próprio `Sheet`.
- **Solução Técnica:**
  - Em `ManagerDashboardPage`: exibir `machine.model ?? 'Modelo não informado'` (alinhado ao `MachineCard`).
  - Em `AllocationPage`: somente marcar a máquina como ocupada se `err instanceof ProblemDetailsError && err.code === 'MACHINE_ALREADY_ALLOCATED'`, exibindo nos demais casos o título real do erro (`err.title` ou `'Não foi possível assumir a sopradora'`).
  - Em `DowntimeModal`: adicionar estado `apiError` renderizado em destaque dentro do `Sheet` sempre que a API rejeitar a requisição com `ProblemDetailsError`.

---

## 3. Planos de Execução Vinculados (Fase 6)

- **Roadmap Geral:** [ROADMAP-GERAL.md](file:///home/ferreito/SGMS/docs/roadmap/ROADMAP-GERAL.md)
- **Plano Backend (Fase 6):** [PLANO-FASE-6-BACKEND.md](file:///home/ferreito/SGMS/docs/roadmap/backend/PLANO-FASE-6-BACKEND.md)
- **Plano Frontend (Fase 6):** [PLANO-FASE-6-FRONTEND.md](file:///home/ferreito/SGMS/docs/roadmap/frontend/PLANO-FASE-6-FRONTEND.md)

