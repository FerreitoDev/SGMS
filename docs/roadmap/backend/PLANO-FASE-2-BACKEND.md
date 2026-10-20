# SGMS — Planejamento Detalhado: Fase 2 (Backend)

> **Documento:** Plano de Execução Técnica & Checklist Sequencial da Fase 2 (Cadastros de Máquinas, Turnos & Alocação 1:1 com Trava ACID)  
> **Status:** 🟡 Em Execução (4 de 7 Tarefas Concluídas)  
> **Módulo:** Backend (NestJS 10 + TypeScript Estrito + Prisma ORM + PostgreSQL 16 + Transações ACID)  
> **Data de Criação:** 2026-10-19  
> **Fonte da Verdade:** [01-requisitos.md](file:///home/ferreito/SGMS/docs/01-requisitos.md) | [02-regras-de-negocio.md](file:///home/ferreito/SGMS/docs/02-regras-de-negocio.md) | [04-modelo-de-dados.md](file:///home/ferreito/SGMS/docs/04-modelo-de-dados.md) | [05-arquitetura.md](file:///home/ferreito/SGMS/docs/05-arquitetura.md) | [ROADMAP-BACKEND.md](file:///home/ferreito/SGMS/docs/roadmap/backend/ROADMAP-BACKEND.md)  

---

## 1. Visão Geral e Princípios Operacionais da Entrega

1. **Exclusividade Operacional Inegociável (RN-01):** Uma máquina de sopro só pode ter exatamente uma alocação ativa por turno e data. O controle deve ser garantido por transação interativa ACID no Prisma e respaldado por índice condicional único no PostgreSQL.
2. **Máquina de Estado Síncrona:** A alocação bem-sucedida atualiza de forma atômica o status da sopradora de `IDLE` para `RUNNING`. Se a máquina estiver desativada (`INACTIVE`), a alocação é sumariamente rejeitada.
3. **Zero Fallback e Validação Temporal:** Horários de turno são validados estritamente no padrão `HH:mm`. Datas de alocação são manipuladas sem suposições arbitrárias de timezone, preservando a data física do turno fabril.
4. **Isolamento de Papéis:** Cadastros e alterações de sopradoras e turnos são exclusivos do `GERENTE`. O `OPERADOR` possui permissão estrita para consultar máquinas ativas e assumir sua alocação.

---

## 2. Matriz de Cobertura de Entidades / Rotas / Contratos

| Rota / Elemento | Arquivo Alvo | Perfil Permitido | Comportamento Operacional / Regra |
| :--- | :--- | :--- | :--- |
| `POST /api/machines` | `backend/src/modules/machines/machines.controller.ts` | `GERENTE` | Cadastra nova sopradora com unicidade de código (`code` ex: `SOPRO-01`) |
| `GET /api/machines` | `backend/src/modules/machines/machines.controller.ts` | Autenticado | Lista sopradoras cadastradas com status e modelo |
| `PATCH /api/machines/:id/status` | `backend/src/modules/machines/machines.controller.ts` | `GERENTE` | Altera status de ativação (`isActive`) ou operacional |
| `POST /api/shifts` | `backend/src/modules/shifts/shifts.controller.ts` | `GERENTE` | Cadastra turno com nome e horários planejados (`startTime`, `endTime`) |
| `GET /api/shifts` | `backend/src/modules/shifts/shifts.controller.ts` | Autenticado | Lista turnos fabris ativos para seleção |
| `POST /api/allocations` | `backend/src/modules/allocations/allocations.controller.ts` | `OPERADOR`, `GERENTE` | Assume máquina no turno com validação de exclusividade 1:1 via `$transaction` |
| `GET /api/allocations/current` | `backend/src/modules/allocations/allocations.controller.ts` | Autenticado | Retorna a alocação `ACTIVE` corrente vinculada ao usuário autenticado |
| `PATCH /api/allocations/:id/release` | `backend/src/modules/allocations/allocations.controller.ts` | Autenticado | Desfaz alocação ativa revertendo máquina para `IDLE` |

---

## 3. Status Geral da Fase

```
Progresso da Fase 2 (Backend): [================----------------] 57% Concluído (4 de 7 tarefas)
```

| ID | Tarefa | Status | Módulo / Artefatos |
| :---: | :--- | :---: | :--- |
| **2.1** | Migrations Prisma de Máquinas, Turnos e Alocações | ✅ Concluída | `backend/prisma/schema.prisma`, `migrations/` |
| **2.2** | Módulo de Máquinas de Sopro (`MachinesModule`) | ✅ Concluída | `backend/src/modules/machines/*` |
| **2.3** | Módulo de Turnos de Trabalho (`ShiftsModule`) | ✅ Concluída | `backend/src/modules/shifts/*` |
| **2.4** | Módulo de Alocações com Trava ACID 1:1 (`AllocationsModule`) | ✅ Concluída | `backend/src/modules/allocations/*` |
| **2.5** | Consulta de Alocação Ativa (`GET /api/allocations/current`) | ⏳ Pendente | `backend/src/modules/allocations/*` |
| **2.6** | Liberação Antecipada de Alocação (`PATCH /api/allocations/:id/release`) | ⏳ Pendente | `backend/src/modules/allocations/*` |
| **2.7** | Auditoria Zero Fallback, Testes E2E de Concorrência & Homologação | ⏳ Pendente | `backend/test/allocations.e2e-spec.ts` |

---

## 4. Detalhamento Técnico das Tarefas

---

### ✅ Tarefa 2.1: Migrations Prisma de Máquinas, Turnos e Alocações
- **Objetivo:** Expandir o schema Prisma com os models `Machine`, `Shift` e `ShiftAllocation`, aplicando o índice único condicional no PostgreSQL para garantir integridade física no banco.
- **Arquivos a Modificar / Criar:**
  - `backend/prisma/schema.prisma`
  - `backend/prisma/migrations/20261020003534_add_machines_shifts_allocations/migration.sql`
- **Contratos e Tipagens Envolvidas:**
  ```prisma
  enum MachineStatus {
    INACTIVE
    IDLE
    RUNNING
    STOPPED
  }

  enum ShiftAllocationStatus {
    ACTIVE
    CLOSED
  }

  model Machine {
    id          String            @id @default(uuid()) @db.Uuid
    code        String            @unique @db.VarChar(30)
    name        String            @db.VarChar(100)
    model       String?           @db.VarChar(100)
    status      MachineStatus     @default(IDLE)
    isActive    Boolean           @default(true)
    createdAt   DateTime          @default(now()) @db.Timestamptz
    updatedAt   DateTime          @updatedAt @db.Timestamptz
    allocations ShiftAllocation[]

    @@map("machines")
  }

  model Shift {
    id          String            @id @default(uuid()) @db.Uuid
    name        String            @db.VarChar(60)
    startTime   String            @db.VarChar(5)
    endTime     String            @db.VarChar(5)
    isActive    Boolean           @default(true)
    createdAt   DateTime          @default(now()) @db.Timestamptz
    updatedAt   DateTime          @updatedAt @db.Timestamptz
    allocations ShiftAllocation[]

    @@map("shifts")
  }

  model ShiftAllocation {
    id          String                @id @default(uuid()) @db.Uuid
    machineId   String                @db.Uuid
    shiftId     String                @db.Uuid
    operatorId  String                @db.Uuid
    shiftDate   DateTime              @db.Date
    status      ShiftAllocationStatus @default(ACTIVE)
    openedAt    DateTime              @default(now()) @db.Timestamptz
    closedAt    DateTime?             @db.Timestamptz

    machine     Machine               @relation(fields: [machineId], references: [id])
    shift       Shift                 @relation(fields: [shiftId], references: [id])
    operator    User                  @relation(fields: [operatorId], references: [id])

    @@index([machineId, shiftDate])
    @@index([operatorId, shiftDate])
    @@map("shift_allocations")
  }
  ```
- **Checklist de Execução Detalhado:**
  - [x] Adicionar os enums e models no `schema.prisma`
  - [x] Executar migration gerando o arquivo SQL
  - [x] Inserir manualmente no arquivo da migration o índice condicional:
    ```sql
    CREATE UNIQUE INDEX "idx_unique_active_machine_shift" 
    ON "shift_allocations" ("machineId", "shiftId", "shiftDate") 
    WHERE "status" = 'ACTIVE';
    ```
  - [x] Executar `npx prisma migrate dev` para aplicar a constraint no banco local
- **Critérios de Aceite e Verificação Obrigatória:**
  - [x] **Caminho Normal:** Migration aplicada com sucesso e tipos Prisma gerados (`prisma generate`).
  - [x] **Violação de Contrato:** Tentativa manual de inserir dois registros com mesmo `machineId`, `shiftId`, `shiftDate` e `status = 'ACTIVE'` rejeitada pelo PostgreSQL com erro `P2002`.

---

### ✅ Tarefa 2.2: Módulo de Máquinas de Sopro (`MachinesModule`)
- **Objetivo:** Construir o CRUD de sopradoras com validação de unicidade de código e gerenciamento de status operacional.
- **Arquivos a Modificar / Criar:**
  - `backend/src/modules/machines/dto/create-machine.dto.ts`
  - `backend/src/modules/machines/dto/update-machine.dto.ts`
  - `backend/src/modules/machines/dto/update-machine-status.dto.ts`
  - `backend/src/modules/machines/dto/list-machines-query.dto.ts`
  - `backend/src/modules/machines/machines.service.ts`
  - `backend/src/modules/machines/machines.controller.ts`
  - `backend/src/modules/machines/machines.module.ts`
  - `backend/test/machines.e2e-spec.ts`
- **Contratos e Tipagens Envolvidas:**
  ```typescript
  export class CreateMachineDto {
    @IsNotEmpty({ message: 'O código identificador é obrigatório.' })
    @IsString()
    code: string;

    @IsNotEmpty({ message: 'O nome da sopradora é obrigatório.' })
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    model?: string;
  }
  ```
- **Checklist de Execução Detalhado:**
  - [x] Endpoint `POST /api/machines` protegido para `Role.GERENTE`
  - [x] Endpoint `GET /api/machines` disponível para todos os usuários autenticados
  - [x] Lançar `ConflictException` (409) em RFC 7807 caso o `code` já esteja em uso
  - [x] Impedir inativação de máquina se ela possuir alocação `ACTIVE` no turno atual
- **Critérios de Aceite e Verificação Obrigatória:**
  - [x] **Caminho Normal:** Criação de sopradora retorna HTTP 201 com status inicial `IDLE`.
  - [x] **Violação de Contrato:** Código duplicado retorna HTTP 409 Conflict estruturado.

---

### ✅ Tarefa 2.3: Módulo de Turnos de Trabalho (`ShiftsModule`)
- **Objetivo:** Permitir ao Gerente configurar turnos fabris, validando rigorosamente os horários de início e término.
- **Arquivos a Modificar / Criar:**
  - `backend/src/modules/shifts/dto/create-shift.dto.ts`
  - `backend/src/modules/shifts/dto/update-shift.dto.ts`
  - `backend/src/modules/shifts/dto/update-shift-status.dto.ts`
  - `backend/src/modules/shifts/dto/list-shifts-query.dto.ts`
  - `backend/src/modules/shifts/shifts.service.ts`
  - `backend/src/modules/shifts/shifts.controller.ts`
  - `backend/src/modules/shifts/shifts.module.ts`
  - `backend/test/shifts.e2e-spec.ts`
- **Contratos e Tipagens Envolvidas:**
  ```typescript
  export class CreateShiftDto {
    @IsNotEmpty({ message: 'O nome do turno é obrigatório.' })
    @IsString()
    name: string;

    @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Horário de início deve estar no formato HH:mm.' })
    startTime: string;

    @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Horário de término deve estar no formato HH:mm.' })
    endTime: string;
  }
  ```
- **Checklist de Execução Detalhado:**
  - [x] Endpoint `POST /api/shifts` restrito a `Role.GERENTE`
  - [x] Endpoint `GET /api/shifts` ordenado por horário de início
  - [x] Validação garantindo que horários vazios ou em formatos inválidos falhem cedo na fronteira
- **Critérios de Aceite e Verificação Obrigatória:**
  - [x] **Caminho Normal:** Cadastro de turno retorna HTTP 201 com dados persistidos.
  - [x] **Violação de Contrato:** Envio de `startTime: "25:00"` rejeitado com HTTP 400 Bad Request.

---

### ✅ Tarefa 2.4: Módulo de Alocações com Trava ACID 1:1 (`AllocationsModule`)
- **Objetivo:** Implementar o fluxo atômico de alocação de operador na máquina, garantindo que duas requisições simultâneas nunca assumam a mesma máquina no mesmo turno.
- **Arquivos a Modificar / Criar:**
  - `backend/src/modules/allocations/dto/create-allocation.dto.ts`
  - `backend/src/modules/allocations/allocations.service.ts`
  - `backend/src/modules/allocations/allocations.controller.ts`
  - `backend/src/modules/allocations/allocations.module.ts`
  - `backend/test/allocations.e2e-spec.ts`
- **Contratos e Tipagens Envolvidas:**
  ```typescript
  export class CreateAllocationDto {
    @IsUUID('4', { message: 'ID da máquina inválido.' })
    machineId: string;

    @IsUUID('4', { message: 'ID do turno inválido.' })
    shiftId: string;

    @IsISO8601({ strict: true }, { message: 'Data do turno deve estar no formato YYYY-MM-DD.' })
    shiftDate: string;
  }
  ```
- **Checklist de Execução Detalhado:**
  - [x] Executar verificação e criação dentro de transação interativa gerenciada `this.prisma.$transaction`
  - [x] Verificar se a máquina existe e está ativa (`isActive: true` e `status != INACTIVE`)
  - [x] Consultar se já existe registro em `shift_allocations` com `machineId`, `shiftId`, `shiftDate` e `status: ACTIVE`
  - [x] Se existir, lançar `ConflictException('Máquina já possui alocação ativa neste turno por outro operador.')`
  - [x] Inserir nova alocação e atualizar atomicamente `machine.status` para `RUNNING`
- **Critérios de Aceite e Verificação Obrigatória:**
  - [x] **Caminho Normal:** Alocação criada com status `ACTIVE` e máquina transita para `RUNNING`.
  - [x] **Violação de Contrato (RN-01):** Tentativa concorrente retorna HTTP 409 Conflict em formato RFC 7807.

---

### ⏳ Tarefa 2.5: Consulta de Alocação Ativa (`GET /api/allocations/current`)
- **Objetivo:** Fornecer ao operador ou gerente uma rota para inspecionar se há uma alocação em andamento vinculada ao seu usuário, recuperando o contexto operacional.
- **Arquivos a Modificar / Criar:**
  - `backend/src/modules/allocations/allocations.service.ts`
  - `backend/src/modules/allocations/allocations.controller.ts`
- **Checklist de Execução Detalhado:**
  - [ ] Consultar `shift_allocations` com `operatorId = user.id` e `status = ACTIVE`
  - [ ] Fazer include dos dados essenciais de `machine` (`code`, `name`, `status`) e `shift` (`name`, `startTime`, `endTime`)
  - [ ] Se não houver alocação ativa, retornar honestamente `null` com HTTP 200 (sem inventar objeto artificial)
- **Critérios de Aceite e Verificação Obrigatória:**
  - [ ] **Caminho Normal:** Operador alocado recebe os dados completos da máquina e turno em andamento.
  - [ ] **Zero Fallback:** Sem alocação ativa, a resposta é `null` (não um objeto mock ou vazio com strings mágicas).

---

### ⏳ Tarefa 2.6: Liberação Antecipada de Alocação (`PATCH /api/allocations/:id/release`)
- **Objetivo:** Permitir desfazer uma alocação antes do fechamento formal do turno, revertendo a máquina para `IDLE` caso o operador precise se desvincular ou corrigir um erro de seleção.
- **Arquivos a Modificar / Criar:**
  - `backend/src/modules/allocations/allocations.service.ts`
  - `backend/src/modules/allocations/allocations.controller.ts`
- **Checklist de Execução Detalhado:**
  - [ ] Validar que apenas o próprio operador vinculado ou um `GERENTE` pode liberar a alocação
  - [ ] Atualizar status da alocação para `CLOSED` com carimbo `closedAt = now()`
  - [ ] Reverter status da máquina correspondente para `IDLE` dentro da mesma transação
- **Critérios de Aceite e Verificação Obrigatória:**
  - [ ] **Caminho Normal:** Alocação fechada e máquina retorna ao status `IDLE`, ficando disponível para nova alocação.
  - [ ] **Violação de Contrato:** Tentativa de outro operador liberar máquina alheia bloqueada com HTTP 403 Forbidden.

---

### ⏳ Tarefa 2.7: Auditoria Zero Fallback, Testes E2E de Concorrência & Homologação
- **Objetivo:** Validar através de testes automatizados ponta a ponta as invariantes de concorrência e integridade de domínio da Fase 2.
- **Arquivos a Modificar / Criar:**
  - `backend/test/allocations.e2e-spec.ts`
  - `backend/test/machines.e2e-spec.ts`
- **Checklist de Execução Detalhado:**
  - [ ] Teste E2E de criação de sopradora com código duplicado $\rightarrow$ 409 Conflict
  - [ ] Teste E2E de alocação válida $\rightarrow$ 201 Created e máquina em `RUNNING`
  - [ ] Teste E2E de duas chamadas paralelas concorrentes (`Promise.all`) para a mesma máquina/turno $\rightarrow$ exatamente 1 sucesso (201) e 1 conflito (409)
  - [ ] Teste E2E de consulta `GET /api/allocations/current` validando retorno `null` quando desocupado
  - [ ] Validação de integridade: zero uso de defaults mágicos em serviços
  - [ ] Validação de build estrito: `npm run build` verde
- **Critérios de Aceite e Verificação Obrigatória:**
  - [ ] Suíte de testes automatizados executando 100% verde.
  - [ ] Compilação de produção executada sem erros de tipagem TypeScript.

---

## 5. Auditoria de Zero Fallback e Integridade de Dados

- [ ] Ausência de modelo técnico de máquina gravada fielmente como `null` no PostgreSQL (`model: null`).
- [ ] Conflito de concorrência em alocação reportado com erro 409 explícito contendo o identificador do conflito, sem recuperação silenciosa.
- [ ] Retorno de ausência de alocação ativa emitido honestamente como `null`.
- [ ] Proibido o uso de `any`, castings arbitrários ou supressão de tipos nos DTOs.

---

## 6. Homologação Final da Fase e Critérios de Encerramento

- [ ] Sopradoras industriais cadastradas no banco com status `IDLE`.
- [ ] Turnos de trabalho operando com horários formatados `HH:mm`.
- [ ] Trava ACID 1:1 comprovada em teste automatizado de concorrência.
- [ ] Build estrito de produção executado com sucesso (`npm run build`).
