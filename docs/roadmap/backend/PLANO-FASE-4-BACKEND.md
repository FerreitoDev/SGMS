# SGMS — Planejamento Detalhado: Fase 4 (Backend)

> **Documento:** Plano de Execução Técnica & Checklist Sequencial da Fase 4 (Fechamento de Turno, Agregações & Relatórios CSV/PDFKit)  
> **Status:** 🟡 Em Execução Atômica (1 de 7 Tarefas Concluídas)  
> **Módulo:** Backend (NestJS 10 + TypeScript Estrito + Prisma ORM + Fast-CSV + PDFKit + PostgreSQL 16)  
> **Data de Criação:** 2026-10-19  
> **Fonte da Verdade:** [01-requisitos.md](file:///home/ferreito/SGMS/docs/01-requisitos.md) | [02-regras-de-negocio.md](file:///home/ferreito/SGMS/docs/02-regras-de-negocio.md) | [04-modelo-de-dados.md](file:///home/ferreito/SGMS/docs/04-modelo-de-dados.md) | [05-arquitetura.md](file:///home/ferreito/SGMS/docs/05-arquitetura.md) | [ROADMAP-BACKEND.md](file:///home/ferreito/SGMS/docs/roadmap/backend/ROADMAP-BACKEND.md)  

---

## 1. Visão Geral e Princípios Operacionais da Entrega

1. **Imutabilidade Pós-Encerramento (RN-06):** O fechamento formal de turno transita o status da alocação para `CLOSED`, congelando permanentemente a inclusão de novos apontamentos por operadores. Tentativas tardias são rejeitadas com HTTP 403 Forbidden.
2. **Cálculo Factual de Disponibilidade e Pareto:** Os cálculos de disponibilidade operacional ($D\%$), ritmo médio (garrafas/hora) e tempo parado são executados diretamente no banco de dados via queries agregadas otimizadas por índices compostos.
3. **Geração Leve de Relatórios sem Headless Browsers:** Os relatórios em PDF são gerados diretamente via PDFKit com baixo consumo de memória RAM, viabilizando compilação em menos de 3 segundos no servidor local modesto da fábrica.
4. **Compatibilidade Nativa com Planilhas Locais:** A exportação CSV adota delimitador ponto-e-vírgula (`;`) e codificação UTF-8 com BOM (`\uFEFF`), assegurando abertura automática no Microsoft Excel sem corrupção de acentuação gráfica.

---

## 2. Matriz de Cobertura de Entidades / Rotas / Contratos

| Rota / Elemento | Arquivo Alvo | Perfil Permitido | Comportamento Operacional / Regra |
| :--- | :--- | :---: | :--- |
| `POST /api/allocations/:id/close` | `backend/src/modules/allocations/allocations.controller.ts` | `OPERADOR`, `GERENTE` | Encerra o turno, grava `closedAt = now()` e reverte a sopradora para `IDLE` |
| `GET /api/reports/dashboard` | `backend/src/modules/reports/reports.controller.ts` | `GERENTE` | Retorna métricas consolidadas (Volume total, Pareto de paradas, Disponibilidade %) |
| `GET /api/reports/csv` | `backend/src/modules/reports/reports.controller.ts` | `GERENTE` | Transmite arquivo binário CSV estruturado via streaming com delimitador `;` |
| `GET /api/reports/pdf` | `backend/src/modules/reports/reports.controller.ts` | `GERENTE` | Transmite arquivo binário PDF corporativo compilado via PDFKit |
| `AllocationStatusGuard` | `backend/src/common/guards/allocation-active.guard.ts` | Global | Bloqueia inserções de produção ou paradas caso a alocação esteja `CLOSED` |

---

## 3. Status Geral da Fase

```
Progresso da Fase 4 (Backend): [====----------------------------] 14% Concluído (1 de 7 tarefas)
```

| ID | Tarefa | Status | Módulo / Artefatos |
| :---: | :--- | :---: | :--- |
| **4.1** | Encerramento de Turno & Guard de Imutabilidade (RN-06) | 🟢 Concluída | `backend/src/modules/allocations/*`, `backend/src/common/guards/*` |
| **4.2** | Consultas Analíticas Agregadas (Disponibilidade & Pareto) | ⏳ Pendente | `backend/src/modules/reports/reports.service.ts` |
| **4.3** | Módulo de Relatórios e DTO de Filtros Analíticos | ⏳ Pendente | `backend/src/modules/reports/*` |
| **4.4** | Compilador de Relatório CSV com Streaming & UTF-8 BOM | ⏳ Pendente | `backend/src/modules/reports/generators/csv.generator.ts` |
| **4.5** | Compilador de Relatório PDF Corporativo (PDFKit) | ⏳ Pendente | `backend/src/modules/reports/generators/pdf.generator.ts` |
| **4.6** | Endpoints de Download com Streaming e Headers HTTP | ⏳ Pendente | `backend/src/modules/reports/reports.controller.ts` |
| **4.7** | Auditoria Zero Fallback, Testes E2E de Performance & Homologação | ⏳ Pendente | `backend/test/reports.e2e-spec.ts` |

---

## 4. Detalhamento Técnico das Tarefas

---

### ✅ Tarefa 4.1: Encerramento de Turno & Guard de Imutabilidade (RN-06)
- **Objetivo:** Implementar a transição atômica de encerramento da alocação de turno e a trava de segurança que bloqueia novas inserções após o encerramento.
- **Arquivos a Modificar / Criar:**
  - `backend/src/modules/allocations/allocations.service.ts`
  - `backend/src/modules/allocations/allocations.controller.ts`
  - `backend/src/common/guards/allocation-active.guard.ts`
  - `backend/src/modules/productions/productions.controller.ts`
  - `backend/src/modules/downtimes/downtimes.controller.ts`
- **Checklist de Execução Detalhado:**
  - [x] Implementar `close(id, user)` no `AllocationsService`:
    - Validar que a alocação existe e está com `status: ACTIVE`
    - Validar que apenas o operador responsável ou um `GERENTE` pode fechar a alocação
    - Executar em transação: (1) Atualizar `ShiftAllocation.status` para `CLOSED` e `closedAt = now()`; (2) Se houver parada aberta (`IN_PROGRESS`), encerrá-la automaticamente com $T_{fim} = now()$; (3) Atualizar `Machine.status` para `IDLE`
  - [x] Implementar `AllocationActiveGuard` validando que `allocation.status === ACTIVE` antes de processar qualquer chamada em `ProductionsController` e `DowntimesController`
  - [x] Retornar HTTP 403 Forbidden em formato RFC 7807 se a alocação já estiver `CLOSED`
- **Critérios de Aceite e Verificação Obrigatória:**
  - [x] **Caminho Normal:** Alocação encerrada transita para `CLOSED` e libera a máquina para `IDLE`.
  - [x] **Violação de Imutabilidade (RN-06):** Tentativa de apontar produção em alocação fechada bloqueada com HTTP 403.

---

### ⏳ Tarefa 4.2: Consultas Analíticas Agregadas (Disponibilidade & Pareto)
- **Objetivo:** Construir as queries SQL/Prisma de consolidação para extrair indicadores exatos de produção e tempo de inatividade.
- **Arquivos a Modificar / Criar:**
  - `backend/src/modules/reports/reports.service.ts`
  - `backend/src/modules/reports/interfaces/dashboard-metrics.interface.ts`
- **Fórmulas de Domínio Implementadas:**
  - $V_{prod} = \sum Q_i$ (Volume Total)
  - $T_{parada} = \sum \text{durationMinutes}_j$ (Minutos Parados)
  - $T_{planejado} = \text{Duração planejada dos turnos no período}$
  - $T_{liquido} = \max(0, T_{planejado} - T_{parada})$
  - $D = (T_{liquido} / T_{planejado}) \times 100\%$ (Disponibilidade Operacional)
  - $R = V_{prod} / (T_{liquido} / 60)$ (Ritmo médio em garrafas/hora)
  - Ranking Pareto: agregação `GROUP BY reason ORDER BY sum(durationMinutes) DESC`
- **Checklist de Execução Detalhado:**
  - [ ] Criar query agregada em `production_entries` agrupando por data/turno/máquina
  - [ ] Criar query agregada em `downtime_records` com filtro de status `RESOLVED`
  - [ ] Implementar cálculo de percentual acumulado de Pareto para cada motivo de parada
- **Critérios de Aceite e Verificação Obrigatória:**
  - [ ] **Caminho Normal:** Query retorna indicadores consistentes com precisão matemática.
  - [ ] **Zero Fallback:** Período sem produção retorna contagem `0` (número real válido), sem inventar valores ou mascarar como nulo.

---

### ⏳ Tarefa 4.3: Módulo de Relatórios e DTO de Filtros Analíticos
- **Objetivo:** Estabelecer a estrutura modular de relatórios e a validação estrita dos filtros de busca por período, máquina e turno.
- **Arquivos a Modificar / Criar:**
  - `backend/src/modules/reports/dto/report-filter.dto.ts`
  - `backend/src/modules/reports/reports.controller.ts`
  - `backend/src/modules/reports/reports.module.ts`
- **Contratos e Tipagens Envolvidas:**
  ```typescript
  export class ReportFilterDto {
    @IsNotEmpty({ message: 'Data inicial é obrigatória.' })
    @IsISO8601({ strict: true }, { message: 'Data inicial deve ser ISO 8601.' })
    startDate: string;

    @IsNotEmpty({ message: 'Data final é obrigatória.' })
    @IsISO8601({ strict: true }, { message: 'Data final deve ser ISO 8601.' })
    endDate: string;

    @IsOptional()
    @IsUUID(undefined, { message: 'ID da máquina inválido.' })
    machineId?: string;

    @IsOptional()
    @IsUUID(undefined, { message: 'ID do turno inválido.' })
    shiftId?: string;
  }
  ```
- **Checklist de Execução Detalhado:**
  - [ ] Validar que `endDate >= startDate`, lançando `BadRequestException` caso invertido
  - [ ] Proteger endpoints do módulo exclusivamente para o perfil `Role.GERENTE`
  - [ ] Configurar injeção do `PrismaService` no `ReportsModule`
- **Critérios de Aceite e Verificação Obrigatória:**
  - [ ] **Caminho Normal:** Filtros válidos retornam payload JSON em `GET /api/reports/dashboard`.
  - [ ] **Violação de Contrato:** Operador tentando consultar relatórios recebe HTTP 403 Forbidden.

---

### ⏳ Tarefa 4.4: Compilador de Relatório CSV com Streaming & UTF-8 BOM
- **Objetivo:** Implementar o gerador de planilhas CSV utilizando streaming com Fast-CSV, assegurando compatibilidade com Excel e consumo mínimo de memória.
- **Arquivos a Modificar / Criar:**
  - `backend/src/modules/reports/generators/csv.generator.ts`
- **Dependências a Instalar:**
  - `fast-csv`
- **Checklist de Execução Detalhado:**
  - [ ] Inserir caractere BOM UTF-8 (`\uFEFF`) no início do stream
  - [ ] Configurar opções do formatador: `{ delimiter: ';', quoteHeaders: true }`
  - [ ] Definir cabeçalhos colunares:
    `["Data", "Turno", "Máquina", "Operador", "Garrafas Boas", "Tempo Parado (min)", "Disponibilidade (%)", "Ritmo (garrafas/h)", "Principal Gargalo"]`
  - [ ] Fazer streaming linha a linha diretamente para a resposta HTTP `res`
- **Critérios de Aceite e Verificação Obrigatória:**
  - [ ] **Caminho Normal:** Arquivo CSV gerado abre no Excel com acentuação correta e colunas separadas.
  - [ ] **Zero Fallback:** Valores ausentes gravados como campo vazio `; ;`, sem palavras fictícias como `"N/A"`.

---

### ⏳ Tarefa 4.5: Compilador de Relatório PDF Corporativo (PDFKit)
- **Objetivo:** Construir o gerador de relatórios em PDF corporativo utilizando PDFKit, produzindo um documento executivo limpo com layout profissional.
- **Arquivos a Modificar / Criar:**
  - `backend/src/modules/reports/generators/pdf.generator.ts`
- **Dependências a Instalar:**
  - `pdfkit`, `@types/pdfkit`
- **Checklist de Execução Detalhado:**
  - [ ] Criar documento PDF com orientação Retrato (A4), margens de 40pt
  - [ ] Cabeçalho corporativo:
    - Título: **GEPF AGROINDÚSTRIA — SGMS**
    - Subtítulo: *Relatório Analítico de Produção e Disponibilidade de Linha*
    - Metadados: Período analisado, Data de Emissão e Usuário Gerador
  - [ ] Quadro resumo de KPIs (cards cinza claro com borda fina): Total de Garrafas, Tempo Total Parado, Taxa de Disponibilidade Geral
  - [ ] Tabela de Paradas por Motivo (Pareto) com colunas: Motivo, Ocorrências, Minutos Totais, % do Tempo Parado
  - [ ] Tabela detalhada de alocações e turnos com linhas alternadas (zebrado suave `#f8fafc`)
  - [ ] Rodapé com numeração de páginas ("Página X de Y")
- **Critérios de Aceite e Verificação Obrigatória:**
  - [ ] **Caminho Normal:** Documento PDF legível e profissional gerado com formatação vetorial limpa.
  - [ ] **Performance (RNF-05):** Geração de relatório com 500 registros concluída em menos de 3 segundos.

---

### ⏳ Tarefa 4.6: Endpoints de Download com Streaming e Headers HTTP
- **Objetivo:** Configurar os endpoints REST que transmitem os relatórios em formato de download binário no navegador.
- **Arquivos a Modificar / Criar:**
  - `backend/src/modules/reports/reports.controller.ts`
- **Checklist de Execução Detalhado:**
  - [ ] Endpoint `GET /api/reports/csv`:
    - Headers: `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="relatorio-producao-sgms-[data].csv"`
  - [ ] Endpoint `GET /api/reports/pdf`:
    - Headers: `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="relatorio-gerencial-sgms-[data].pdf"`
  - [ ] Pipe direto do stream do gerador para o objeto `res` do Express
- **Critérios de Aceite e Verificação Obrigatória:**
  - [ ] **Caminho Normal:** Requisição GET via navegador dispara imediatamente o download do arquivo.

---

### ⏳ Tarefa 4.7: Auditoria Zero Fallback, Testes E2E de Performance & Homologação
- **Objetivo:** Validar a imutabilidade do fechamento de turno e a performance da geração de relatórios sob carga de dados.
- **Arquivos a Modificar / Criar:**
  - `backend/test/reports.e2e-spec.ts`
- **Checklist de Execução Detalhado:**
  - [ ] Teste E2E de fechamento de turno e tentativa de novo apontamento $\rightarrow$ 403 Forbidden
  - [ ] Teste E2E de download de CSV com validação do delimitador `;` e cabeçalhos
  - [ ] Teste E2E de geração de PDF medindo tempo de execução $\le 3\text{s}$ para massa de 500 registros
  - [ ] Auditoria de código: zero uso de `|| 0`, `|| ""` ou stubs
  - [ ] Validação do build estrito: `npm run build` verde
- **Critérios de Aceite e Verificação Obrigatória:**
  - [ ] 100% dos testes E2E aprovados.
  - [ ] Compilação de produção sem erros de tipos.

---

## 5. Auditoria de Zero Fallback e Integridade de Dados

- [ ] Métricas reais `0` preservadas e distinguidas de ausência de dados (ex: zero paradas = `0 min`, nunca traço ou nulo).
- [ ] Ausência legítima de motivo principal nos dados analíticos propagada como `null`.
- [ ] Proibido o uso de valores padrão em campos de data nos relatórios; filtros exigem datas explícitas.
- [ ] Delimitador de CSV respeita estritamente o contrato de `;` para prevenir distorções numéricas no Excel em português.

---

## 6. Homologação Final da Fase e Critérios de Encerramento

- [ ] Turno encerrado via API com travamento de novas inserções.
- [ ] Relatório CSV gerado e baixado com formatação íntegra.
- [ ] Relatório PDF compilado via PDFKit em tempo $< 3\text{s}$.
- [ ] Compilação de produção executada com sucesso (`npm run build`).
