# SGMS — Planejamento Detalhado: Fase 5 (Backend)

> **Documento:** Plano de Execução Técnica & Checklist Sequencial da Fase 5 (Pausa Planejada `REFEICAO_INTERVALO` & Segregação Estatística OEE)  
> **Status:** ⚪ A Iniciar (0 de 2 Tarefas Concluídas — 0%)  
> **Módulo:** Backend (NestJS 10 + TypeScript Estrito + Prisma ORM + PostgreSQL 16)  
> **Data de Criação:** 2026-10-28  
> **Fonte da Verdade:** [01-requisitos.md](file:///home/ferreito/SGMS/docs/01-requisitos.md) | [02-regras-de-negocio.md](file:///home/ferreito/SGMS/docs/02-regras-de-negocio.md) | [04-modelo-de-dados.md](file:///home/ferreito/SGMS/docs/04-modelo-de-dados.md) | [ROADMAP-BACKEND.md](file:///home/ferreito/SGMS/docs/roadmap/backend/ROADMAP-BACKEND.md)  

---

## 1. Visão Geral e Princípios Operacionais da Entrega

1. **Segregação entre Pausa Planejada e Falha Operacional (RN-10):** A inclusão do motivo `REFEICAO_INTERVALO` no enum `DowntimeReason` permite que o operador paralise formalmente a sopradora durante o horário de almoço/intervalo sem que esse tempo contamine o Gráfico de Pareto de Gargalos ou derrube a Taxa de Disponibilidade Operacional ($D\%$).
2. **Matemática OEE Fiel à Engenharia de Produção:** O tempo acumulado de `REFEICAO_INTERVALO` ($T_{pausa\_planejada}$) é abatido diretamente da janela planejada do turno ($T_{disp\_turno} = \max(0, T_{planejado\_turno} - T_{pausa\_planejada})$), e somente as paradas não planejadas ($T_{parada\_falha}$, onde `reason != 'REFEICAO_INTERVALO'`) entram na dedução do tempo operacional líquido ($T_{liquido}$) e no ranking de Pareto.

---

## 2. Matriz de Cobertura de Entidades / Rotas / Contratos

| Elemento / Serviço | Arquivo Alvo | Perfil Permitido | Comportamento Operacional / Regra |
| :--- | :--- | :---: | :--- |
| Enum `DowntimeReason` | `backend/prisma/schema.prisma` | Global | Adiciona o valor `'REFEICAO_INTERVALO'` ao tipo nativo PostgreSQL e cliente Prisma |
| `DOWNTIME_REASON_LABELS` | `backend/src/modules/reports/constants/downtime-labels.constant.ts` | Global | Mapeia `[DowntimeReason.REFEICAO_INTERVALO]: 'Refeição / Intervalo'` |
| `getDashboardMetrics` | `backend/src/modules/reports/reports.service.ts` | `GERENTE` | Exclui `REFEICAO_INTERVALO` do `pareto` e deduz sua duração de `totalPlannedMinutes` |
| `getDetailedAllocationRows` | `backend/src/modules/reports/reports.service.ts` | `GERENTE` | Exclui `REFEICAO_INTERVALO` do `mainBottleneck` e deduz sua duração de `plannedMinutes` |

---

## 3. Status Geral da Fase

```
Progresso da Fase 5 (Backend): [--------------------------------] 0% Concluído (0 de 2 tarefas)
```

| ID | Tarefa | Status | Módulo / Artefatos |
| :---: | :--- | :---: | :--- |
| **5.1** | Expansão do Enum `DowntimeReason` no Prisma, Migration & Labels | ⚪ A Iniciar | `backend/prisma/schema.prisma`, `backend/src/modules/reports/constants/downtime-labels.constant.ts` |
| **5.2** | Segregação Estatística OEE no `ReportsService` & Testes (RN-10) | ⚪ A Iniciar | `backend/src/modules/reports/reports.service.ts`, `backend/test/*` |

---

## 4. Detalhamento Técnico das Tarefas

---

### ⬜ Tarefa 5.1: Expansão do Enum `DowntimeReason` no Prisma, Migration & Labels
- **Objetivo:** Adicionar o motivo `REFEICAO_INTERVALO` ao schema Prisma, gerar a migration correspondente para o PostgreSQL, regenerar o Prisma Client e atualizar o dicionário de rótulos do módulo de relatórios.
- **Arquivos a Modificar / Criar:**
  - `backend/prisma/schema.prisma`
  - `backend/prisma/migrations/<timestamp>_add_refeicao_intervalo_reason/migration.sql`
  - `backend/src/modules/reports/constants/downtime-labels.constant.ts`
- **Checklist de Execução Detalhado:**
  - [ ] Adicionar `REFEICAO_INTERVALO` ao enum `DowntimeReason` em `backend/prisma/schema.prisma`
  - [ ] Criar/aplicar migration com `ALTER TYPE "DowntimeReason" ADD VALUE 'REFEICAO_INTERVALO';` e executar `npx prisma generate`
  - [ ] Adicionar `[DowntimeReason.REFEICAO_INTERVALO]: 'Refeição / Intervalo'` em `DOWNTIME_REASON_LABELS` (`downtime-labels.constant.ts`)
- **Critérios de Aceite e Verificação Obrigatória:**
  - [ ] **Caminho Normal:** `npm run build` no backend compila sem erros de tipagem no `Record<DowntimeReason, string>`.
  - [ ] **Zero Fallback:** Todos os membros do enum possuem rótulo explícito mapeado na constante central.

---

### ⬜ Tarefa 5.2: Segregação Estatística OEE no `ReportsService` & Testes (RN-10)
- **Objetivo:** Atualizar os cálculos de disponibilidade operacional, tempo parado de falha e ranking de Pareto em `ReportsService` para segregar `DowntimeReason.REFEICAO_INTERVALO` conforme a regra `RN-10`.
- **Arquivos a Modificar / Criar:**
  - `backend/src/modules/reports/reports.service.ts`
  - `backend/src/modules/reports/reports.service.spec.ts` (ou `backend/test/reports.e2e-spec.ts`)
- **Fórmulas OEE Obrigatórias (`RN-10`):**
  - $T_{pausa\_planejada} = \sum \text{durationMinutes}$ onde `reason === DowntimeReason.REFEICAO_INTERVALO`
  - $T_{parada\_falha} = \sum \text{durationMinutes}$ onde `reason !== DowntimeReason.REFEICAO_INTERVALO`
  - $T_{disp\_turno} = \max(0, T_{planejado\_bruto} - T_{pausa\_planejada})$
  - $T_{liquido} = \max(0, T_{disp\_turno} - T_{parada\_falha})$
  - $D = T_{disp\_turno} > 0 ? (T_{liquido} / T_{disp\_turno}) \times 100 : 0$
  - Ranking `pareto` e `mainBottleneck`: populados estritamente com registros onde `reason !== DowntimeReason.REFEICAO_INTERVALO`.
- **Checklist de Execução Detalhado:**
  - [ ] Em `getDashboardMetrics`: separar a soma de `plannedBreakMinutes` (`REFEICAO_INTERVALO`) de `unplannedDowntimeMinutes` (demais motivos); não inserir `REFEICAO_INTERVALO` no `reasonAggregation` do Pareto; calcular `totalPlannedMinutes = Math.max(0, rawPlannedMinutes - plannedBreakMinutes)` e `totalDowntimeMinutes = unplannedDowntimeMinutes`
  - [ ] Em `getDetailedAllocationRows`: separar `plannedBreakMinutes` de `downtimeMinutes` (falhas); descontar `plannedBreakMinutes` de `plannedMinutes`; ignorar `REFEICAO_INTERVALO` na eleição do `mainBottleneck`
  - [ ] Adicionar/atualizar teste automatizado comprovando que uma parada de 60 min de `REFEICAO_INTERVALO` não reduz a `availabilityPercentage` em um turno sem falhas (100% de disponibilidade) e não aparece na lista `pareto`
- **Critérios de Aceite e Verificação Obrigatória:**
  - [ ] **Caminho Normal:** Turno de 480 min com 60 min de `REFEICAO_INTERVALO` e 0 min de falhas resulta em `totalPlannedMinutes = 420`, `totalDowntimeMinutes = 0`, `availabilityPercentage = 100` e `pareto = []`.
  - [ ] **Violação / Caso Misto:** Turno de 480 min com 60 min de `REFEICAO_INTERVALO` e 42 min de `COMPRESSOR` resulta em `totalPlannedMinutes = 420`, `totalDowntimeMinutes = 42`, `availabilityPercentage = 90%` e `pareto` contendo apenas `COMPRESSOR` (100%).

---

## 5. Auditoria de Zero Fallback & Homologação da Fase 5 (Backend)
- [ ] Nenhum valor de enum tratado com string mágica fora de `DowntimeReason`.
- [ ] `npm run build` e testes passando 100% verdes.

