# SGMS — Planejamento Detalhado: Fase 4 (Frontend)

> **Documento:** Plano de Execução Técnica & Checklist Sequencial da Fase 4 (Fechamento de Turno, Dashboard de Gargalos & Extração de Relatórios)  
> **Status:** 🟡 Em Execução (4 de 7 Tarefas Concluídas — 57%)  
> **Módulo:** Frontend (React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui + Recharts + Axios + Sonner)  
> **Data de Criação:** 2026-10-19  
> **Fonte da Verdade:** [01-requisitos.md](file:///home/ferreito/SGMS/docs/01-requisitos.md) | [02-regras-de-negocio.md](file:///home/ferreito/SGMS/docs/02-regras-de-negocio.md) | [03-fluxos.md](file:///home/ferreito/SGMS/docs/03-fluxos.md) | [05-arquitetura.md](file:///home/ferreito/SGMS/docs/05-arquitetura.md) | [ROADMAP-FRONTEND.md](file:///home/ferreito/SGMS/docs/roadmap/frontend/ROADMAP-FRONTEND.md)  

---

## 1. Visão Geral e Princípios Operacionais da Entrega

1. **Encerramento Consciente de Jornada (RN-06):** O encerramento de turno pelo operador exige confirmação explícita em painel `Sheet`, apresentando o resumo de garrafas e paradas apontadas antes do congelamento irreversível da alocação.
2. **Visualização Direta de Gargalos (Análise de Pareto):** O Gerente de Produção visualiza no dashboard os principais motivos de interrupção classificados em gráfico de Pareto (colunas de minutos parados combinadas com curva percentual acumulada), evidenciando os 20% de causas que geram 80% das perdas.
3. **Download Instantâneo de Relatórios (CSV e PDF):** Os relatórios gerenciais são baixados no navegador via streaming de Blob (`window.URL.createObjectURL(blob)`), preservando a nomenclatura padronizada com carimbo de data.
4. **Zero Fallback em Indicadores:** Períodos sem produção exibem honestamente `0 garrafas` e taxa de disponibilidade baseada em ausência de paradas, sem mascarar números reais como traços ou mensagens genéricas.

---

## 2. Matriz de Cobertura de Telas / Componentes / Contratos

| Rota / Tela | Componente Alvo | Perfil Permitido | Comportamento Operacional / Regra |
| :--- | :--- | :---: | :--- |
| `/admin/dashboard` | `frontend/src/pages/admin/dashboard-page.tsx` | `GERENTE` | Painel gerencial com KPIs de produção, disponibilidade e gráfico de Pareto de paradas |
| `/admin/relatorios` | `frontend/src/pages/admin/reports-page.tsx` | `GERENTE` | Filtros por data/máquina/turno com botões de download direto para CSV e PDF |
| `CloseShiftSheet` | `frontend/src/components/operator/close-shift-sheet.tsx` | `OPERADOR`, `GERENTE` | Painel Sheet de encerramento seguro com resumo consolidado e trava irreversível |
| `ParetoChart` | `frontend/src/components/dashboard/pareto-chart.tsx` | `GERENTE` | Gráfico combinado Recharts (barras de tempo + linha percentual 80/20) |
| `KpiCards` | `frontend/src/components/dashboard/kpi-cards.tsx` | `GERENTE` | Cartões corporativos com Volume, Tempo Parado, Disponibilidade % e Ritmo |

---

## 3. Status Geral da Fase

```
Progresso da Fase 4 (Frontend): [========================--------] 86% Concluído (6 de 7 tarefas)
```

| ID | Tarefa | Status | Módulo / Artefatos |
| :---: | :--- | :---: | :--- |
| **4.1** | Componente de Encerramento Seguro de Turno (`CloseShiftSheet`) | 🟢 Concluída | `frontend/src/components/operator/*` |
| **4.2** | Tipos TypeScript Analíticos e Serviço de Relatórios (`reportsService`) | 🟢 Concluída | `frontend/src/services/reports-service.ts`, `frontend/src/types/reports.ts` |
| **4.3** | Cards Corporativos de Indicadores e KPIs (`KpiCards`) | 🟢 Concluída | `frontend/src/components/dashboard/*` |
| **4.4** | Gráfico de Pareto de Paradas da Linha (`ParetoChart` com Recharts) | 🟢 Concluída | `frontend/src/components/dashboard/pareto-chart.tsx` |
| **4.5** | Tela do Dashboard Gerencial Integrada (`ManagerDashboardPage`) | 🟢 Concluída | `frontend/src/pages/admin/dashboard-page.tsx` |
| **4.6** | Tela de Filtros e Extração de Relatórios CSV/PDF (`ReportsPage`) | 🟢 Concluída | `frontend/src/pages/admin/reports-page.tsx` |
| **4.7** | Auditoria Zero Fallback, Responsividade & Build de Produção | ⏳ Pendente | Testes visuais e compilação de produção |

---

## 4. Detalhamento Técnico das Tarefas

---

### ✅ Tarefa 4.1: Componente de Encerramento Seguro de Turno (`CloseShiftSheet`)
- **Objetivo:** Adicionar o botão "Encerrar Turno" no Console do Operador, abrindo painel `Sheet` de confirmação irreversível que finaliza a alocação e libera a máquina para `IDLE`.
- **Arquivos a Modificar / Criar:**
  - `frontend/src/components/operator/close-shift-sheet.tsx`
  - `frontend/src/pages/operator/operator-console-page.tsx`
- **Checklist de Execução Detalhado:**
  - [x] Implementar confirmação usando o primitivo `Sheet` do shadcn (bottom sheet no mobile e side sheet no desktop)
  - [x] Apresentar resumo: Total de garrafas sopradas no turno e quantidade de paradas apontadas
  - [x] Alerta em destaque: *"Atenção: Ao encerrar o turno, nenhum novo apontamento poderá ser feito nesta máquina."*
  - [x] Ao confirmar, disparar `allocationsService.close(allocationId)`
  - [x] Em caso de sucesso, exibir `toast.success("Turno encerrado com sucesso!")` e redirecionar para a tela de alocação `/chao-de-fabrica/alocacao`
- **Critérios de Aceite e Verificação Obrigatória:**
  - [x] **Caminho Normal:** Fechamento confirmado libera a máquina e redireciona o operador.
  - [x] **Cancelamento:** Clicar em "Continuar Operando" fecha o painel Sheet sem alterar o estado da alocação.

---

### ✅ Tarefa 4.2: Tipos TypeScript Analíticos e Serviço de Relatórios (`reportsService`)
- **Objetivo:** Declarar os contratos de dados dos indicadores analíticos e implementar os métodos de consulta e download binário no cliente HTTP.
- **Arquivos a Modificar / Criar:**
  - `frontend/src/types/reports.ts`
  - `frontend/src/services/reports-service.ts`
- **Contratos e Tipagens Envolvidas:**
  ```typescript
  export interface ParetoItem {
    reason: string;
    reasonLabel: string;
    occurrences: number;
    totalMinutes: number;
    percentage: number;
    cumulativePercentage: number;
  }

  export interface DashboardMetrics {
    totalBottles: number;
    totalDowntimeMinutes: number;
    totalPlannedMinutes: number;
    availabilityPercentage: number;
    averagePaceBottlesPerHour: number;
    pareto: ParetoItem[];
  }

  export interface ReportFilter {
    startDate: string;
    endDate: string;
    machineId?: string;
    shiftId?: string;
  }
  ```
- **Checklist de Execução Detalhado:**
  - [x] Implementar `reportsService.getDashboardMetrics(filters)` retornando `DashboardMetrics`
  - [x] Implementar `reportsService.downloadCsv(filters)` com `responseType: 'blob'`
  - [x] Implementar `reportsService.downloadPdf(filters)` com `responseType: 'blob'`
- **Critérios de Aceite e Verificação Obrigatória:**
  - [x] **Caminho Normal:** Métodos tipados sem `any` com suporte a blobs binários.

---

### ✅ Tarefa 4.3: Cards Corporativos de Indicadores e KPIs (`KpiCards`)
- **Objetivo:** Construir a seção superior do dashboard com métricas sintetizadas em cards corporativos com ícones Lucide e formatação visual elegante.
- **Arquivos a Modificar / Criar:**
  - `frontend/src/components/dashboard/kpi-cards.tsx`
- **Checklist de Execução Detalhado:**
  - [x] Card 1: **Volume Produzido** (Total de garrafas, ex: `48.200 un`, ícone de garrafa/fábrica)
  - [x] Card 2: **Tempo Parado** (Minutos e horas formatadas, ex: `1h 45min`, ícone de alerta)
  - [x] Card 3: **Disponibilidade Geral** (Percentual formatado com 1 casa decimal, ex: `87.5%`, com barra de progresso sutil)
  - [x] Card 4: **Ritmo Médio** (Garrafas por hora de operação líquida, ex: `3.200 un/h`, ícone de velocímetro)
- **Critérios de Aceite e Verificação Obrigatória:**
  - [x] **Caminho Normal:** Cards renderizam valores formatados de forma clara e profissional.
  - [x] **Zero Fallback:** Valor `0` exibido honestamente como `0 un` ou `0%`, sem omitir ou trocar por `"N/A"`.

---

### ✅ Tarefa 4.4: Gráfico de Pareto de Paradas da Linha (`ParetoChart` com Recharts)
- **Objetivo:** Desenvolver o componente de visualização gráfica para análise de gargalos operacionais da linha de sopro.
- **Arquivos a Modificar / Criar:**
  - `frontend/src/components/dashboard/pareto-chart.tsx`
- **Dependências a Instalar:**
  - `recharts`
- **Checklist de Execução Detalhado:**
  - [x] Criar gráfico composto `ComposedChart` responsivo (`ResponsiveContainer`)
  - [x] Eixo X: rótulos amigáveis dos motivos de parada (ex: "Forno", "Molde", "Pré-forma", "Compressor", "Mecânica", "Elétrica", "Outros")
  - [x] Eixo Y Esquerdo: Minutos totais de parada (barras azuis corporativas)
  - [x] Eixo Y Direito: Percentual acumulado de 0 a 100% (linha vermelha com pontos destacados)
  - [x] Tooltip customizado apresentando: Ocorrências, Minutos Totais e % Acumulado
  - [x] Linha de referência horizontal tracejada na marca de 80% (Princípio de Pareto)
- **Critérios de Aceite e Verificação Obrigatória:**
  - [x] **Caminho Normal:** Gráfico renderiza barras ordenadas decrescentemente com linha percentual correta.
  - [x] **Estado Vazio:** Se não houver paradas no período, exibir mensagem corporativa amigável ("Nenhuma parada registrada no período selecionado").

---

### ✅ Tarefa 4.5: Tela do Dashboard Gerencial Integrada (`ManagerDashboardPage`)
- **Objetivo:** Integrar os cards de KPIs, o gráfico de Pareto e os seletores de período na tela principal do Gerente de Produção.
- **Arquivos a Modificar / Criar:**
  - `frontend/src/pages/admin/dashboard-page.tsx`
  - `frontend/src/components/layout/app-layout.tsx` (inclusão do item "Dashboard" no menu)
- **Checklist de Execução Detalhado:**
  - [x] Barra superior de filtros rápidos: "Hoje", "Últimos 7 dias", "Este Mês" e seletor customizado de datas
  - [x] Grade de máquinas em tempo real: cartões compactos indicando quais sopradoras estão operando agora no galpão
  - [x] Renderização dos `KpiCards` e do `ParetoChart`
  - [x] Tratamento de loading states via Skeleton screens do shadcn
- **Critérios de Aceite e Verificação Obrigatória:**
  - [x] **Caminho Normal:** Gerente seleciona período e visualiza imediatamente as métricas consolidadas.

---

### ✅ Tarefa 4.6: Tela de Filtros e Extração de Relatórios CSV/PDF (`ReportsPage`)
- **Objetivo:** Criar a interface de exportação formal de relatórios com suporte a download em streaming sem recarregar a página.
- **Arquivos a Modificar / Criar:**
  - `frontend/src/pages/admin/reports-page.tsx`
  - `frontend/src/lib/download-helper.ts`
- **Checklist de Execução Detalhado:**
  - [x] Formulário com: Data Inicial, Data Final, Seletor de Máquina (opcional) e Seletor de Turno (opcional)
  - [x] Helper `triggerBlobDownload(blob, filename)` para disparar o download no navegador
  - [x] Botão primário: "Exportar Planilha (CSV)" com ícone de tabela
  - [x] Botão secundário: "Exportar Relatório Executivo (PDF)" com ícone de documento
  - [x] Desabilitar botões durante o download com spinner de carregamento e toast de confirmação
- **Critérios de Aceite e Verificação Obrigatória:**
  - [x] **Caminho Normal:** Clique em exportar baixa o arquivo no navegador em menos de 3 segundos.

---

### ⏳ Tarefa 4.7: Auditoria Zero Fallback, Responsividade & Build de Produção
- **Objetivo:** Executar auditoria final de integridade de código, validação de responsividade nos 4 breakpoints e compilação do bundle de produção.
- **Arquivos a Inspecionar:**
  - `frontend/src/**/*`
- **Checklist de Execução Detalhado:**
  - [ ] Inspecionar componentes garantindo zero fallbacks silenciosos ou casts arbitrários
  - [ ] Validar responsividade do Dashboard em tablet (768px) e desktop (1440px)
  - [ ] Validar acessibilidade e contraste das cores do gráfico de Pareto
  - [ ] Executar `npm run build` e confirmar geração limpa de todos os chunks
- **Critérios de Aceite e Verificação Obrigatória:**
  - [ ] Compilação de produção verde sem erros ou warnings de tipos.
  - [ ] Fluxo ponta a ponta homologado: Encerramento de turno $\rightarrow$ Métricas refletidas no Dashboard $\rightarrow$ Relatório CSV e PDF baixados.

---

## 5. Auditoria de Zero Fallback e Integridade de Dados

- [ ] Ausência de dados em gráficos renderizada honestamente como estado vazio sem gerar erros de ponto flutuante (`NaN`).
- [ ] Duração de paradas e volumes de produção formatados estritamente com base nos dados do servidor, sem arredondamentos arbitrários no cliente.
- [ ] Mensagens de erro de download extraídas fielmente de payloads RFC 7807 quando a API retornar 400 ou 403.
- [ ] Proibido o uso de `any` nas props dos gráficos Recharts e nos estados de filtros.

---

## 6. Homologação Final da Fase e Critérios de Encerramento

- [ ] Encerramento de turno testado no Console com travamento de novas inserções.
- [x] Dashboard gerencial exibindo KPIs e gráfico de Pareto integrado.
- [x] Relatórios em CSV e PDF baixados e validados no ambiente local.
- [ ] Compilação de produção executada com sucesso (`npm run build`).
