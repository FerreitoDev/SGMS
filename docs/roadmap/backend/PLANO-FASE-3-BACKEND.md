# SGMS — Planejamento Detalhado: Fase 3 (Backend)

> **Documento:** Plano de Execução Técnica & Checklist Sequencial da Fase 3 (Apontamento de Produção, Paradas & Sincronização Idempotente)  
> **Status:** 🟡 Em Execução (6 de 7 Tarefas Concluídas)  
> **Módulo:** Backend (NestJS 10 + TypeScript Estrito + Prisma ORM + PostgreSQL 16 + Transações ACID)  
> **Data de Criação:** 2026-10-19  
> **Fonte da Verdade:** [01-requisitos.md](file:///home/ferreito/SGMS/docs/01-requisitos.md) | [02-regras-de-negocio.md](file:///home/ferreito/SGMS/docs/02-regras-de-negocio.md) | [03-fluxos.md](file:///home/ferreito/SGMS/docs/03-fluxos.md) | [04-modelo-de-dados.md](file:///home/ferreito/SGMS/docs/04-modelo-de-dados.md) | [ROADMAP-BACKEND.md](file:///home/ferreito/SGMS/docs/roadmap/backend/ROADMAP-BACKEND.md)  

---

## 1. Visão Geral e Princípios Operacionais da Entrega

1. **Idempotência Radical no Chão de Fábrica (RN-07):** Toda mutação de produção ou parada gerada no cliente carrega obrigatoriamente um `clientUuid` (UUID v4). Reenvios acidentais provenientes de reconexão de rede ou filas offline são descartados idempotentemente sem duplicar contagens ou tempos de parada.
2. **Consistência Temporal e Bloqueio de Futuro (RN-03, RN-05):** Nenhum carimbo de evento pode ser posterior ao relógio do servidor ($T_{evento} \le T_{servidor}$). Paradas exigem $T_{fim} \ge T_{ini}$, com cálculo exato de duração em minutos inteiros.
3. **Qualidade de Dados nas Paradas (RN-04):** O motivo `OUTROS` impõe justificativa textual obrigatória com no mínimo 5 caracteres; para qualquer outro motivo, o campo é forçado estritamente a `null`.
4. **Sincronização em Lote Transacional (`POST /api/sync`):** Pacotes de eventos acumulados no IndexedDB durante quedas de energia/rede são processados dentro de uma transação interativa ACID no Prisma (`prisma.$transaction`), garantindo integridade de gravação tudo-ou-nada.

---

## 2. Matriz de Cobertura de Entidades / Rotas / Contratos

| Rota / Elemento | Arquivo Alvo | Perfil Permitido | Comportamento Operacional / Regra |
| :--- | :--- | :---: | :--- |
| `POST /api/productions` | `backend/src/modules/productions/productions.controller.ts` | `OPERADOR`, `GERENTE` | Registra contagem de garrafas sopradas ($Q \ge 1$) com `clientUuid` único |
| `GET /api/productions/allocation/:id` | `backend/src/modules/productions/productions.controller.ts` | Autenticado | Retorna histórico de lançamentos do turno com volume acumulado |
| `POST /api/downtimes/start` | `backend/src/modules/downtimes/downtimes.controller.ts` | `OPERADOR`, `GERENTE` | Inicia parada em tempo real (`status: IN_PROGRESS`) e altera máquina para `STOPPED` |
| `PATCH /api/downtimes/:id/resolve` | `backend/src/modules/downtimes/downtimes.controller.ts` | `OPERADOR`, `GERENTE` | Finaliza parada, calcula duração e reverte máquina para `RUNNING` |
| `POST /api/downtimes/retroactive` | `backend/src/modules/downtimes/downtimes.controller.ts` | `OPERADOR`, `GERENTE` | Cria parada retroativa consolidada com $T_{ini}$ e $T_{fim}$ validados |
| `POST /api/sync` | `backend/src/modules/sync/sync.controller.ts` | Autenticado | Processa lote de apontamentos offline com descarte idempotente |

---

## 3. Status Geral da Fase

```
Progresso da Fase 3 (Backend): [==========================------] 86% Concluído (6 de 7 tarefas)
```

| ID | Tarefa | Status | Módulo / Artefatos |
| :---: | :--- | :---: | :--- |
| **3.1** | Migrations Prisma de Produção e Paradas | ✅ Concluída | `backend/prisma/schema.prisma`, `migrations/` |
| **3.2** | Módulo de Apontamento de Produção (`ProductionsModule`) | ✅ Concluída | `backend/src/modules/productions/*` |
| **3.3** | Módulo de Paradas em Tempo Real (`DowntimesModule`) | ✅ Concluída | `backend/src/modules/downtimes/*` |
| **3.4** | Apontamento de Paradas Retroativas e Validação de Motivos | ✅ Concluída | `backend/src/modules/downtimes/*` |
| **3.5** | Módulo de Sincronização Offline em Lote (`SyncModule`) | ✅ Concluída | `backend/src/modules/sync/*` |
| **3.6** | Validação Temporal Estrita e Bloqueio de Timestamps Futuros | ✅ Concluída | `backend/src/common/validators/is-not-future-date.validator.ts` |
| **3.7** | Auditoria Zero Fallback, Testes E2E de Idempotência & Homologação | ⏳ Pendente | `backend/test/sync-idempotency.e2e-spec.ts` |

---

## 4. Detalhamento Técnico das Tarefas

---

### ✅ Tarefa 3.1: Migrations Prisma de Produção e Paradas
- **Objetivo:** Adicionar os models `ProductionEntry` e `DowntimeRecord` com enums correspondentes e chaves únicas `clientUuid` para suporte a idempotência.
- **Arquivos a Modificar / Criar:**
  - `backend/prisma/schema.prisma`
  - `backend/prisma/migrations/20261021211855_add_productions_downtimes/migration.sql`
- **Contratos e Tipagens Envolvidas:**
  ```prisma
  enum DowntimeReason {
    PRE_FORMA
    COMPRESSOR
    AQUECIMENTO_FORNO
    MOLDE
    MECANICA
    ELETRICA
    OUTROS
  }

  enum DowntimeStatus {
    IN_PROGRESS
    RESOLVED
  }

  model ProductionEntry {
    id           String          @id @default(uuid()) @db.Uuid
    clientUuid   String          @unique @db.Uuid
    allocationId String          @db.Uuid
    quantity     Int
    timestamp    DateTime        @db.Timestamptz
    createdAt    DateTime        @default(now()) @db.Timestamptz

    allocation   ShiftAllocation @relation(fields: [allocationId], references: [id])

    @@index([allocationId, timestamp])
    @@map("production_entries")
  }

  model DowntimeRecord {
    id              String          @id @default(uuid()) @db.Uuid
    clientUuid      String          @unique @db.Uuid
    allocationId    String          @db.Uuid
    reason          DowntimeReason
    justification   String?         @db.VarChar(255)
    status          DowntimeStatus
    startTime       DateTime        @db.Timestamptz
    endTime         DateTime?       @db.Timestamptz
    durationMinutes Int?
    createdAt       DateTime        @default(now()) @db.Timestamptz
    updatedAt       DateTime        @updatedAt @db.Timestamptz

    allocation      ShiftAllocation @relation(fields: [allocationId], references: [id])

    @@index([allocationId, reason])
    @@index([startTime, endTime])
    @@map("downtime_records")
  }
  ```
- **Checklist de Execução Detalhado:**
  - [x] Adicionar os models no `schema.prisma`
  - [x] Executar `npx prisma migrate dev --name add_productions_downtimes`
  - [x] Verificar integridade das chaves estrangeiras referenciando `shift_allocations(id)`
- **Critérios de Aceite e Verificação Obrigatória:**
  - [x] **Caminho Normal:** Migration aplicada sem erros e client Prisma atualizado.
  - [x] **Violação de Contrato:** Inserção com `clientUuid` duplicado rejeitada no banco de dados.

---

### ✅ Tarefa 3.2: Módulo de Apontamento de Produção (`ProductionsModule`)
- **Objetivo:** Implementar o registro horário e acumulado de garrafas sopradas com validação de quantidade estritamente positiva ($Q \ge 1$).
- **Arquivos a Modificar / Criar:**
  - `backend/src/modules/productions/dto/create-production.dto.ts`
  - `backend/src/modules/productions/productions.service.ts`
  - `backend/src/modules/productions/productions.controller.ts`
  - `backend/src/modules/productions/productions.module.ts`
- **Contratos e Tipagens Envolvidas:**
  ```typescript
  export class CreateProductionDto {
    @IsUUID(undefined, { message: 'clientUuid deve ser um UUID v4 válido.' })
    clientUuid: string;

    @IsUUID(undefined, { message: 'allocationId deve ser um UUID válido.' })
    allocationId: string;

    @IsInt({ message: 'Quantidade deve ser um número inteiro.' })
    @IsPositive({ message: 'Quantidade de garrafas deve ser estritamente maior que zero.' })
    quantity: number;

    @IsISO8601({ strict: true }, { message: 'Timestamp deve ser ISO 8601.' })
    timestamp: string;
  }
  ```
- **Checklist de Execução Detalhado:**
  - [x] Validar que a alocação existe e está com `status = ACTIVE` (RN-06)
  - [x] Validar que o operador autenticado é o responsável pela alocação (ou perfil `GERENTE`) (RN-08)
  - [x] Tratar `clientUuid` pré-existente: se já existir, retornar o registro com HTTP 200 sem duplicar
  - [x] Gravar registro e responder com HTTP 201 Created
- **Critérios de Aceite e Verificação Obrigatória:**
  - [x] **Caminho Normal:** Apontamento válido grava registro e retorna dados persistidos.
  - [x] **Violação de Contrato (RN-02):** Envio de `quantity: 0` ou `quantity: -50` rejeitado com HTTP 422.

---

### ✅ Tarefa 3.3: Módulo de Paradas em Tempo Real (`DowntimesModule`)
- **Objetivo:** Habilitar abertura imediata de ocorrência de parada quando a sopradora para e resolução posterior com cálculo automático da duração.
- **Arquivos a Modificar / Criar:**
  - `backend/src/modules/downtimes/dto/start-downtime.dto.ts`
  - `backend/src/modules/downtimes/dto/resolve-downtime.dto.ts`
  - `backend/src/modules/downtimes/downtimes.service.ts`
  - `backend/src/modules/downtimes/downtimes.controller.ts`
  - `backend/src/modules/downtimes/downtimes.module.ts`
- **Contratos e Tipagens Envolvidas:**
  ```typescript
  export class StartDowntimeDto {
    @IsUUID()
    clientUuid: string;

    @IsUUID()
    allocationId: string;

    @IsEnum(DowntimeReason, { message: 'Motivo de parada inválido.' })
    reason: DowntimeReason;

    @IsOptional()
    @IsString()
    justification?: string;

    @IsISO8601()
    startTime: string;
  }

  export class ResolveDowntimeDto {
    @IsISO8601()
    endTime: string;
  }
  ```
- **Checklist de Execução Detalhado:**
  - [x] `POST /api/downtimes/start`: executa dentro de transação, grava parada com `status: IN_PROGRESS` e altera máquina para `MachineStatus.STOPPED`
  - [x] `PATCH /api/downtimes/:id/resolve`: valida que $T_{fim} \ge T_{ini}$, calcula `durationMinutes = Math.floor((endTime - startTime) / 60000)`, atualiza status para `RESOLVED` e altera máquina para `MachineStatus.RUNNING`
- **Critérios de Aceite e Verificação Obrigatória:**
  - [x] **Caminho Normal:** Parada aberta altera status da máquina para `STOPPED`; resolução calcula minutos e retorna para `RUNNING`.
  - [x] **Violação de Contrato (RN-03):** Resolução com $T_{fim} < T_{ini}$ rejeitada com HTTP 422 Unprocessable Entity.

---

### ✅ Tarefa 3.4: Apontamento de Paradas Retroativas e Validação de Motivos
- **Objetivo:** Permitir registrar ocorrências ocorridas no passado com início e fim já consolidados, aplicando validação condicional obrigatória de justificativa para o motivo `OUTROS`.
- **Arquivos a Modificar / Criar:**
  - `backend/src/modules/downtimes/dto/retroactive-downtime.dto.ts`
  - `backend/src/modules/downtimes/downtimes.service.ts`
  - `backend/src/modules/downtimes/downtimes.controller.ts`
- **Contratos e Tipagens Envolvidas:**
  ```typescript
  export class RetroactiveDowntimeDto {
    @IsUUID()
    clientUuid: string;

    @IsUUID()
    allocationId: string;

    @IsEnum(DowntimeReason)
    reason: DowntimeReason;

    @IsOptional()
    @IsString()
    justification?: string;

    @IsISO8601()
    startTime: string;

    @IsISO8601()
    endTime: string;
  }
  ```
- **Checklist de Execução Detalhado:**
  - [x] Validar condicionalmente (RN-04):
    - Se `reason === DowntimeReason.OUTROS`: `justification` obrigatória e `justification.trim().length >= 5`. Se falhar, lançar `BadRequestException` (400) com mensagem clara.
    - Se `reason !== DowntimeReason.OUTROS`: forçar `justification = null`.
  - [x] Calcular duração em minutos e gravar parada já com status `RESOLVED`
  - [x] Não alterar o status atual da máquina (pois a parada já ocorreu e terminou no passado)
- **Critérios de Aceite e Verificação Obrigatória:**
  - [x] **Caminho Normal:** Parada retroativa registrada com duração calculada e status `RESOLVED`.
  - [x] **Violação de Contrato (RN-04):** Envio de `OUTROS` com justificativa vazia ou ausente rejeitado com HTTP 400 em RFC 7807.

---

### ✅ Tarefa 3.5: Módulo de Sincronização Offline em Lote (`SyncModule`)
- **Objetivo:** Processar o pacote de eventos acumulados no IndexedDB do operador após queda de rede/energia, assegurando atomicidade e descarte idempotente de registros repetidos.
- **Arquivos a Modificar / Criar:**
  - `backend/src/modules/sync/dto/sync-batch.dto.ts`
  - `backend/src/modules/sync/sync.service.ts`
  - `backend/src/modules/sync/sync.controller.ts`
  - `backend/src/modules/sync/sync.module.ts`
- **Contratos e Tipagens Envolvidas:**
  ```typescript
  export class SyncEventItemDto {
    @IsUUID()
    clientUuid: string;

    @IsEnum(['PRODUCTION', 'DOWNTIME'])
    type: 'PRODUCTION' | 'DOWNTIME';

    @IsObject()
    payload: Record<string, any>;
  }

  export class SyncBatchDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SyncEventItemDto)
    events: SyncEventItemDto[];
  }
  ```
- **Checklist de Execução Detalhado:**
  - [x] Abrir transação interativa gerenciada `this.prisma.$transaction`
  - [x] Para cada evento do lote:
    - Verificar existência prévia do `clientUuid` na tabela alvo
    - Se existir, ignorar inserção (idempotência preservada)
    - Se não existir, executar as validações de domínio correspondentes e persistir
  - [x] Retornar HTTP 200 com lista de `clientUuids` processados com sucesso
- **Critérios de Aceite e Verificação Obrigatória:**
  - [x] **Caminho Normal:** Lote de 10 eventos gravado em bloco e confirmado.
  - [x] **Idempotência (RN-07):** Reenvio imediato do mesmo lote responde HTTP 200 sem duplicar registros no banco.

---

### ✅ Tarefa 3.6: Validação Temporal Estrita e Bloqueio de Timestamps Futuros
- **Objetivo:** Prevenir que horários adulterados ou relógios descalibrados de celulares registrem eventos no futuro em relação ao servidor da fábrica.
- **Arquivos a Modificar / Criar:**
  - `backend/src/common/validators/is-not-future-date.validator.ts`
  - `backend/src/modules/productions/dto/create-production.dto.ts`
  - `backend/src/modules/downtimes/dto/start-downtime.dto.ts`
- **Checklist de Execução Detalhado:**
  - [x] Criar validador customizado `IsNotFutureDate` com tolerância máxima de 2 minutos para desvio de relógio
  - [x] Rejeitar qualquer carimbo com $T_{evento} > T_{servidor} + 2\text{min}$ lançando `UnprocessableEntityException` (422)
  - [x] Validar que o evento pertence à data/horário do turno da alocação
- **Critérios de Aceite e Verificação Obrigatória:**
  - [x] **Caminho Normal:** Eventos dentro da janela temporal aceitos normalmente.
  - [x] **Violação Temporal (RN-05):** Data futura rejeitada com HTTP 422 em RFC 7807.

---

### ⏳ Tarefa 3.7: Auditoria Zero Fallback, Testes E2E de Idempotência & Homologação
- **Objetivo:** Provar a robustez do pipeline de chão de fábrica e a ausência de corrupção de dados sob estresse de rede.
- **Arquivos a Modificar / Criar:**
  - `backend/test/productions.e2e-spec.ts`
  - `backend/test/downtimes.e2e-spec.ts`
  - `backend/test/sync-idempotency.e2e-spec.ts`
- **Checklist de Execução Detalhado:**
  - [ ] Teste E2E de reenvio de lote offline provando que a contagem de garrafas permanece idêntica
  - [ ] Teste E2E de paradas retroativas com e sem motivo `OUTROS`
  - [ ] Teste E2E de tentativa de apontamento em alocação fechada $\rightarrow$ 403 Forbidden
  - [ ] Auditoria de código: zero uso de `|| 0`, `|| ""` ou fallbacks silenciosos
  - [ ] Execução do build de produção: `npm run build` verde
- **Critérios de Aceite e Verificação Obrigatória:**
  - [ ] 100% dos testes E2E executando com sucesso.
  - [ ] Compilação de produção verde sem erros de tipagem.

---

## 5. Auditoria de Zero Fallback e Integridade de Dados

- [ ] Campo `justification` forçado a `null` quando o motivo não for `OUTROS` (sem strings vazias `""`).
- [ ] Quantidades de garrafas estritamente inteiras e positivas; proibido aceitar `0` como ausência de dados.
- [ ] Duração de paradas em andamento gravada honestamente como `null` (`durationMinutes: null`), calculada apenas na resolução.
- [ ] Descarte idempotente por `clientUuid` registrado em log auditável sem mascarar anomalias.

---

## 6. Homologação Final da Fase e Critérios de Encerramento

- [ ] Endpoints `/api/productions/*`, `/api/downtimes/*` e `/api/sync` operacionais.
- [ ] Teste de colisão offline validado (reenvio de lote não altera dados).
- [ ] Parada com motivo `OUTROS` rejeitada na ausência de justificativa mínima.
- [ ] Compilação de produção executada com sucesso (`npm run build`).
