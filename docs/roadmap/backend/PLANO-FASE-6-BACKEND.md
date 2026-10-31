# SGMS — Planejamento Detalhado: Fase 6 (Backend)

> **Documento:** Plano de Execução Técnica & Checklist Sequencial da Fase 6 (Resolução de Bugs Críticos: Exclusividade Física de Alocação, Proteção de Inativação de Operador e Sincronização Offline de Resolução de Parada)  
> **Status:** 🟡 Em Execução (1 de 2 Tarefas Concluídas — 50%)  
> **Módulo:** Backend (NestJS 10 + TypeScript Estrito + Prisma ORM + PostgreSQL 16)  
> **Data de Criação:** 2026-10-28  
> **Fonte da Verdade:** [06-auditoria-bugs-e-inconsistencias.md](file:///home/ferreito/SGMS/docs/06-auditoria-bugs-e-inconsistencias.md) | [02-regras-de-negocio.md](file:///home/ferreito/SGMS/docs/02-regras-de-negocio.md) | [ROADMAP-BACKEND.md](file:///home/ferreito/SGMS/docs/roadmap/backend/ROADMAP-BACKEND.md)  

---

## 1. Visão Geral e Princípios Operacionais da Entrega

1. **Exclusividade Física Absoluta da Máquina (`BUG-03` / `RN-01`):** Uma máquina física (`machineId`) jamais pode possuir mais de uma alocação `ACTIVE` simultaneamente, mesmo que o segundo operador selecione outro `shiftId` ou outra `shiftDate`, ou que a máquina esteja temporariamente em status `STOPPED` (parada em andamento).
2. **Proteção contra Alocação Órfã na Inativação de Operador (`BUG-05` / `RF-02`):** Assim como máquinas e turnos não podem ser inativados enquanto houver alocação `ACTIVE`, um operador não pode ser inativado enquanto detiver uma alocação `ACTIVE` aberta, evitando que a máquina fique presa em `RUNNING` sem que o operador consiga encerrá-la.
3. **Resolução Transacional de Parada em Lote Offline (`BUG-04` / `RF-09`):** Quando o operador retoma a produção (`ResolveDowntime`) em modo offline e o dispositivo sincroniza posteriormente via `POST /api/sync/batch`, o `SyncService` deve localizar e encerrar a parada `IN_PROGRESS` existente na alocação (calculando `durationMinutes` e revertendo a máquina para `RUNNING`), em vez de tentar criar um novo registro duplicado ou falhar por falta de `reason`.

---

## 2. Matriz de Cobertura de Serviços / Contratos

| Elemento / Serviço | Arquivo Alvo | Bugs Cobertos | Comportamento Operacional / Regra |
| :--- | :--- | :---: | :--- |
| `AllocationsService.create` | `backend/src/modules/allocations/allocations.service.ts` | `BUG-03` | Bloqueia com `HTTP 409 MACHINE_ALREADY_ALLOCATED` se existir qualquer alocação `ACTIVE` para o `machineId` ou se `machine.status !== IDLE` |
| `UsersService.updateStatus` | `backend/src/modules/users/users.service.ts` | `BUG-05` | Bloqueia com `HTTP 409 USER_HAS_ACTIVE_ALLOCATION` ao tentar inativar operador com alocação `ACTIVE` e impede alteração de conta `GERENTE` |
| `SyncService.processBatch` | `backend/src/modules/sync/sync.service.ts` | `BUG-04` | Suporta resolução de parada `IN_PROGRESS` existente quando o evento `DOWNTIME` trouxer `endTime` para uma parada aberta na alocação |

---

## 3. Status Geral da Fase

```
Progresso da Fase 6 (Backend): [================----------------] 50% Concluído (1 de 2 tarefas)
```

| ID | Tarefa | Status | Módulo / Artefatos |
| :---: | :--- | :---: | :--- |
| **6.1** | Trava Física 1:1 de Máquina (`BUG-03`) & Proteção de Inativação de Operador (`BUG-05`) | 🟢 Concluída | `backend/src/modules/allocations/allocations.service.ts`, `backend/src/modules/users/users.service.ts` |
| **6.2** | Resolução de Parada Ativa no `SyncService.processBatch` (`BUG-04`) | ⚪ Pendente | `backend/src/modules/sync/sync.service.ts` |

---

## 4. Detalhamento Técnico das Tarefas

---

### 🟢 Tarefa 6.1: Trava Física 1:1 de Máquina (`BUG-03`) & Proteção de Inativação de Operador (`BUG-05`)
- **Objetivo:** Garantir em `AllocationsService.create` que uma máquina nunca receba segunda alocação `ACTIVE` simultânea (independentemente de turno/data ou se estiver `STOPPED`), e garantir em `UsersService.updateStatus` que um operador com alocação `ACTIVE` não possa ser inativado antes do encerramento/liberação da máquina.
- **Arquivos a Modificar:**
  - `backend/src/modules/allocations/allocations.service.ts`
  - `backend/src/modules/users/users.service.ts`
- **Checklist de Execução Detalhado:**
  - [x] Em `AllocationsService.create`:
    - [x] Verificar `where: { machineId: dto.machineId, status: ShiftAllocationStatus.ACTIVE }` (sem restringir por `shiftId` e `shiftDate`), garantindo que qualquer alocação `ACTIVE` aberta na máquina dispare `ConflictException` (`HTTP 409 MACHINE_ALREADY_ALLOCATED`)
    - [x] Caso `machine.status === MachineStatus.RUNNING || machine.status === MachineStatus.STOPPED`, lançar `ConflictException` (`HTTP 409 MACHINE_ALREADY_ALLOCATED`)
  - [x] Em `UsersService.updateStatus`:
    - [x] Validar se o usuário pertence ao perfil `UserRole.OPERADOR`
    - [x] Se `dto.isActive === false`, verificar `this.prisma.shiftAllocation.findFirst({ where: { operatorId: id, status: ShiftAllocationStatus.ACTIVE } })` e, caso exista, lançar `ConflictException` (`HTTP 409 USER_HAS_ACTIVE_ALLOCATION`)
- **Critérios de Aceite e Verificação Obrigatória:**
  - [x] **Caminho Normal:** Máquina `IDLE` é alocada normalmente e transita para `RUNNING`.
  - [x] **Violação de Contrato (`BUG-03` e `BUG-05`):** Tentativa de alocar máquina já `ACTIVE` em outro turno ou tentar inativar operador com alocação `ACTIVE` retorna `HTTP 409 Conflict` no formato RFC 7807.

---

### ⬜ Tarefa 6.2: Resolução de Parada Ativa no `SyncService.processBatch` (`BUG-04`)
- **Objetivo:** Permitir que o endpoint de sincronização em lote (`POST /api/sync/batch`) processe eventos de resolução de parada (`Retomar Produção`) gerados quando o dispositivo estava offline, atualizando a parada `IN_PROGRESS` existente para `RESOLVED` e revertendo o status da máquina para `RUNNING`.
- **Arquivos a Modificar:**
  - `backend/src/modules/sync/sync.service.ts`
- **Checklist de Execução Detalhado:**
  - [ ] Em `SyncService.processBatch` (bloco `SyncEventType.DOWNTIME`):
    - [ ] Quando `endTime` estiver presente no payload e existir uma parada `IN_PROGRESS` aberta na alocação (ou se `reason` não for informado por tratar-se exclusivamente de resolução da parada ativa daquela alocação), validar `endTime` (`assertNotFutureDate` e $T_{fim} \ge T_{ini}$), atualizar o registro `IN_PROGRESS` existente para `DowntimeStatus.RESOLVED` com `endTime` e `durationMinutes`, e atualizar a máquina para `MachineStatus.RUNNING`
    - [ ] Manter a criação normal de parada retroativa consolidada (`RESOLVED`) quando não houver parada `IN_PROGRESS` sendo resolvida e `reason` + `startTime` + `endTime` forem informados
- **Critérios de Aceite e Verificação Obrigatória:**
  - [ ] **Caminho Normal:** Evento de retomada de produção gravado offline resolve a parada `IN_PROGRESS` e retorna a máquina para `RUNNING` ao sincronizar.
  - [ ] **Compilação:** `npm --prefix backend run build` 100% verde.

