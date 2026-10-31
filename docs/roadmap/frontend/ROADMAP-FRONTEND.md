# SGMS — Roadmap Técnico: Frontend (Nível 2)

> **Fase Geral Correspondente:** [ROADMAP-GERAL.md](file:///home/ferreito/SGMS/docs/roadmap/ROADMAP-GERAL.md)  
> **Status:** 🟡 Planejamento Ativo (Fase 7)  
> **Última Atualização:** 2026-10-31  

---

## 1. Matriz de Fases e Planos Vinculados

| Fase Setorial | Título da Entrega Técnica | Plano de Execução Vinculado | Status |
| :---: | :--- | :--- | :---: |
| **Fase 1** | Setup Vite, Design System shadcn/ui, Autenticação & Gestão de Contas | [PLANO-FASE-1-FRONTEND.md](file:///home/ferreito/SGMS/docs/roadmap/frontend/PLANO-FASE-1-FRONTEND.md) | 🟢 Concluída |
| **Fase 2** | Gestão de Máquinas, Turnos & Interface de Alocação Touch | [PLANO-FASE-2-FRONTEND.md](file:///home/ferreito/SGMS/docs/roadmap/frontend/PLANO-FASE-2-FRONTEND.md) | 🟢 Concluída |
| **Fase 3** | Console Operacional Touch, Modal de Paradas & Persistência IndexedDB (PWA) | [PLANO-FASE-3-FRONTEND.md](file:///home/ferreito/SGMS/docs/roadmap/frontend/PLANO-FASE-3-FRONTEND.md) | 🟢 Concluída |
| **Fase 4** | Fechamento de Turno, Dashboard de Gargalos & Extração de Relatórios | [PLANO-FASE-4-FRONTEND.md](file:///home/ferreito/SGMS/docs/roadmap/frontend/PLANO-FASE-4-FRONTEND.md) | 🟢 Concluída |
| **Fase 5** | Unificação do Gatilho de Paradas, Travamento Temporal & Pausa de Refeição | [PLANO-FASE-5-FRONTEND.md](file:///home/ferreito/SGMS/docs/roadmap/frontend/PLANO-FASE-5-FRONTEND.md) | 🟢 Concluída |
| **Fase 6** | UUID v4 em LAN HTTP, Lista de Últimos Lançamentos, Bloqueio de Máquina `STOPPED` & Zero Fallback | [PLANO-FASE-6-FRONTEND.md](file:///home/ferreito/SGMS/docs/roadmap/frontend/PLANO-FASE-6-FRONTEND.md) | 🟢 Concluída |
| **Fase 7** | Containerização Frontend (`Dockerfile` Multi-Stage + `nginx.conf` Porta 80, SPA & Proxy `/api`) | [PLANO-FASE-7-FRONTEND.md](file:///home/ferreito/SGMS/docs/roadmap/frontend/PLANO-FASE-7-FRONTEND.md) | 🟢 Concluída |

---

## 2. Detalhamento das Fases Técnicas de Frontend

### Fase 1: Setup Vite, Design System shadcn/ui, Autenticação & Gestão de Contas
- **Referência Hierárquica:** Fase 1 de [ROADMAP-GERAL.md](file:///home/ferreito/SGMS/docs/roadmap/ROADMAP-GERAL.md).
- **Requisitos Técnicos e de Negócio:**
  - `RF-01`: Tela de login corporativa, persistência de sessão e decodificação do JWT.
  - `RF-02`: Interface para cadastro, listagem e inativação de operadores (exclusivo para `GERENTE`).
  - `RNF-01`: Tratamento padronizado de erros RFC 7807 vindos da API e exibição de toasts via `sonner`.
  - `RNF-02`: Aplicação SPA servida e executada na rede local (LAN).
  - `RNF-06`: Configuração inicial de PWA (Web App Manifest corporativo e ícones para tela inicial).
- **Dependências Bloqueantes:** Endpoints de autenticação da Fase 1 do backend (`POST /api/auth/login`, `GET/POST /api/users`).
- **Checklist Técnico Sequencial:**
  - [x] 1.1: Inicialização do projeto React 18 com Vite, TypeScript e Tailwind CSS (`create-vite`)
  - [x] 1.2: Instalação e configuração do shadcn/ui (`Button`, `Input`, `Card`, `Sheet`, `Table`, `Badge`, `Toaster` — *Dialogs proibidos*)
  - [x] 1.3: Configuração do cliente HTTP Axios com interceptors para anexar JWT e mapear erros RFC 7807
  - [x] 1.4: Implementação do `AuthContext` e hook `useAuth` para controle de sessão e papéis (`GERENTE`/`OPERADOR`)
  - [x] 1.5: Criação da tela de Login com formulário tipado em `react-hook-form` + `zod`
  - [x] 1.6: Criação das rotas protegidas (`ProtectedRoute`) e roteamento contextual por perfil de acesso
  - [x] 1.7: Tela de Gestão de Operadores para desktop do Gerente com tabela de usuários e painel Sheet de cadastro
  - [x] 1.8: Validação visual e teste de compilação sem warnings (`npm run build`)
- **Plano de Execução Vinculado:** [PLANO-FASE-1-FRONTEND.md](file:///home/ferreito/SGMS/docs/roadmap/frontend/PLANO-FASE-1-FRONTEND.md)

---

### Fase 2: Gestão de Máquinas, Turnos & Interface de Alocação Touch
- **Referência Hierárquica:** Fase 2 de [ROADMAP-GERAL.md](file:///home/ferreito/SGMS/docs/roadmap/ROADMAP-GERAL.md).
- **Requisitos Técnicos e de Negócio:**
  - `RF-03`: Telas para cadastro e controle de status de sopradoras pelo Gerente.
  - `RF-04`: Telas para definição e ajuste de turnos fabris pelo Gerente.
  - `RF-05`: Interface touch para o Operador selecionar máquina e turno no chão de fábrica.
  - `RNF-03`: Alvos de toque $\ge 44\text{px}$ com feedback tátil e tratamento de conflito 409.
- **Dependências Bloqueantes:** Endpoints da Fase 2 do backend (`/api/machines`, `/api/shifts`, `/api/allocations`).
- **Checklist Técnico Sequencial:**
  - [x] 2.1: Tela administrativa de Máquinas (cadastro de tags `SOPRO-XX`, modelo e toggle de ativação)
  - [x] 2.2: Tela administrativa de Turnos (horários de início/fim com validação de formato `HH:mm`)
  - [x] 2.3: Tela de Alocação Mobile para o Operador (cartões grandes com alvos de toque `h-14`)
  - [x] 2.4: Integração com `POST /api/allocations` e captura de erro 409 exibindo toast explicativo amigável
  - [x] 2.5: Redirecionamento automático para o Console Operacional da máquina alocada
  - [x] 2.6: Teste de usabilidade e responsividade em resoluções de smartphone (360x640) e tablet (768x1024)
- **Plano de Execução Vinculado:** [PLANO-FASE-2-FRONTEND.md](file:///home/ferreito/SGMS/docs/roadmap/frontend/PLANO-FASE-2-FRONTEND.md)

---

### Fase 3: Console Operacional Touch, Modal de Paradas & Persistência IndexedDB (PWA)
- **Referência Hierárquica:** Fase 3 de [ROADMAP-GERAL.md](file:///home/ferreito/SGMS/docs/roadmap/ROADMAP-GERAL.md).
- **Requisitos Técnicos e de Negócio:**
  - `RF-06`: Gaveta touch rápida para apontamento de garrafas com teclado numérico nativo.
  - `RF-07`: Modal de parada com lista seletiva de motivos e campo obrigatório para `OUTROS`.
  - `RF-08`: Pré-carregamento de timestamp atual com inputs editáveis para lançamentos retroativos.
  - `RF-09` & `RNF-04`: Persistência local em IndexedDB com UUID v4 e sincronização offline transparente.
  - `RNF-06`: Service Worker configurado via `vite-plugin-pwa` para cache completo de assets estáticos.
- **Dependências Bloqueantes:** Endpoints da Fase 3 do backend (`/api/productions`, `/api/downtimes`, `/api/sync`).
- **Checklist Técnico Sequencial:**
  - [x] 3.1: Instalação e configuração do `vite-plugin-pwa` e da biblioteca `idb` para IndexedDB
  - [x] 3.2: Implementação da camada de armazenamento local `OfflineStorage` (tabela `pending_events`)
  - [x] 3.3: Implementação do hook `useOfflineSync` com monitoramento de conexão e disparo em lote para `/api/sync`
  - [x] 3.4: Construção do Console do Operador (cabeçalho com máquina ativa, status e badge de conectividade)
  - [x] 3.5: Componente `ProductionDrawer` usando `Sheet` do shadcn com input `type="number" inputMode="numeric"`
  - [x] 3.6: Componente `DowntimeModal` com cronômetro em tempo real para paradas ativas e aba para modo retroativo
  - [x] 3.7: Validação Zod garantindo que o campo `justification` seja obrigatório se motivo for `OUTROS`
  - [x] 3.8: Simulação física de modo avião/desconexão provando que nenhum apontamento digitado se perde
- **Plano de Execução Vinculado:** [PLANO-FASE-3-FRONTEND.md](file:///home/ferreito/SGMS/docs/roadmap/frontend/PLANO-FASE-3-FRONTEND.md)

---

### Fase 4: Fechamento de Turno, Dashboard de Gargalos & Extração de Relatórios
- **Referência Hierárquica:** Fase 4 de [ROADMAP-GERAL.md](file:///home/ferreito/SGMS/docs/roadmap/ROADMAP-GERAL.md).
- **Requisitos Técnicos e de Negócio:**
  - `RF-10`: Dashboard corporativo com visualização de gargalos, disponibilidade e ranking de paradas.
  - `RF-11`: Interface de extração de relatórios com download de arquivos CSV e PDF.
  - `RN-06`: Fluxo de encerramento seguro de jornada de trabalho pelo operador.
  - `RNF-05`: Renderização instantânea de gráficos na rede local.
- **Dependências Bloqueantes:** Endpoints da Fase 4 do backend (`/api/allocations/:id/close`, `/api/reports/*`).
- **Checklist Técnico Sequencial:**
  - [x] 4.1: Componente de encerramento de turno no Console do Operador com painel Sheet de confirmação irreversível
  - [x] 4.2: Tela de Dashboard Gerencial para desktop (cards de KPIs: Produção Total, Disponibilidade %, Tempo Parado)
  - [x] 4.3: Gráfico de Pareto de paradas com `Recharts` ou componentes customizados shadcn
  - [x] 4.4: Tela de Relatórios com seletores de período (`DateRangePicker`), filtro por Máquina e Turno
  - [x] 4.5: Mecanismo de download via streaming de blobs binários (`text/csv` e `application/pdf`)
  - [x] 4.6: Tratamento de loading states e feedback de progresso durante a geração dos relatórios
  - [x] 4.7: Homologação visual integrada de toda a jornada nos navegadores alvo (Chrome e Safari)
- **Plano de Execução Vinculado:** [PLANO-FASE-4-FRONTEND.md](file:///home/ferreito/SGMS/docs/roadmap/frontend/PLANO-FASE-4-FRONTEND.md)

---

### Fase 5: Unificação do Gatilho de Paradas, Travamento Temporal, Input Puro & Isolamento RBAC
- **Referência Hierárquica:** Fase 5 de [ROADMAP-GERAL.md](file:///home/ferreito/SGMS/docs/roadmap/ROADMAP-GERAL.md).
- **Requisitos Técnicos e de Negócio:**
  - `RF-01`: Isolamento estrito de rotas por perfil (`requiredRole="OPERADOR"` em `/chao-de-fabrica/*` e `requiredRole="GERENTE"` em `/admin/*`) e limpeza de `location.state.from` no login para evitar que o Gerente caia na tela do Operador após troca de conta.
  - `RF-06` & `RNF-03`: Remoção dos botões de adição rápida (`+50`, `+100`, `+250`, `+500`) e remoção das setas (`spinners`) no input numérico do `ProductionDrawer`.
  - `RF-07`: Remoção do botão redundante `"Lançar Parada Ocorrida Anteriormente (Retroativa)"` da tela principal e inclusão do motivo `REFEICAO_INTERVALO` (`"Refeição / Intervalo"`).
  - `RF-08` & `RN-09`: Travamento do horário de início na aba **Tempo Real (Agora)** (fixado no instante corrente sem input editável), mantendo inputs de data/hora editáveis apenas na aba **Lançamento Retroativo**.
- **Dependências Bloqueantes:** Fase 5 do Backend (enum `REFEICAO_INTERVALO` aceito pela API).
- **Checklist Técnico Sequencial:**
  - [x] 5.1: Atualização de `DowntimeReason` em `domain.ts` e `downtime-schema.ts` com `REFEICAO_INTERVALO` e rótulo amigável no card de status do console
  - [x] 5.2: Remoção do botão secundário `"Lançar Parada Ocorrida Anteriormente (Retroativa)"` em `OperatorConsolePage` e travamento de data/hora na aba **Tempo Real (Agora)** em `DowntimeModal` (`RN-09`)
  - [x] 5.3: Remoção dos botões de adição rápida (`+50` a `+500`) e das setas incrementais (`spinners`) em `ProductionDrawer`
  - [x] 5.4: Correção do isolamento de rotas por perfil (`AppRoutes`, `ProtectedRoute` e `LoginPage`) impedindo que o `GERENTE` seja redirecionado para telas de `OPERADOR`
  - [x] 5.5: Travamento de data/hora no `ProductionDrawer` (`RN-09`), correção do submit/schema Zod (`noValidate` + `z.preprocess`) e distinção entre erro HTTP 4xx e falha de rede offline
- **Plano de Execução Vinculado:** [PLANO-FASE-5-FRONTEND.md](file:///home/ferreito/SGMS/docs/roadmap/frontend/PLANO-FASE-5-FRONTEND.md)

---

### Fase 6: UUID v4 em LAN HTTP, Lista de Últimos Lançamentos, Bloqueio de Máquina `STOPPED` & Zero Fallback
- **Referência Hierárquica:** Fase 6 de [ROADMAP-GERAL.md](file:///home/ferreito/SGMS/docs/roadmap/ROADMAP-GERAL.md) e [06-auditoria-bugs-e-inconsistencias.md](file:///home/ferreito/SGMS/docs/06-auditoria-bugs-e-inconsistencias.md).
- **Checklist Técnico Sequencial:**
  - [x] 6.1: Gerador UUID v4 compatível com LAN HTTP em `OfflineStorage.generateUuid` (`BUG-01`)
  - [x] 6.2: Ordenação decrescente + exibição de buffer local em `"ÚLTIMOS LANÇAMENTOS DO TURNO"` (`BUG-02`) e correção de `handleResolveDowntime` (`BUG-04`)
  - [x] 6.3: Bloqueio de seleção de máquina `STOPPED` na Alocação (`BUG-03`), remoção do fallback `'Modelo Padrão'` no Dashboard e feedback inline no `DowntimeModal` (`BUG-06`)
- **Plano de Execução Vinculado:** [PLANO-FASE-6-FRONTEND.md](file:///home/ferreito/SGMS/docs/roadmap/frontend/PLANO-FASE-6-FRONTEND.md)

---

### Fase 7: Containerização Frontend (`Dockerfile` Multi-Stage + `nginx.conf` Porta 80, SPA & Proxy `/api`)
- **Referência Hierárquica:** Fase 7 de [ROADMAP-GERAL.md](file:///home/ferreito/SGMS/docs/roadmap/ROADMAP-GERAL.md) e [05-arquitetura.md](file:///home/ferreito/SGMS/docs/05-arquitetura.md).
- **Requisitos Técnicos e de Negócio:**
  - `RNF-02`: Entrega da SPA/PWA na porta `80` padrão da rede local (`http://sgms.local` ou `http://<IP_DO_SERVIDOR>`) com `VITE_API_URL=/api`.
  - `RNF-05`: Compressão `gzip` de assets estáticos e proxy reverso `/api` para `http://sgms-backend:3001/api` no Nginx.
  - `RNF-06`: Diretivas `Cache-Control: no-cache` para `index.html`, `sw.js` e `manifest.webmanifest` (garantindo atualização imediata do PWA) e cache imutável (`1y`) para bundles com hash em `/assets/`.
- **Dependências Bloqueantes:** Fases 1 a 6 do Frontend concluídas.
- **Checklist Técnico Sequencial:**
  - [x] 7.1: Criação de `frontend/nginx.conf` (SPA fallback `try_files $uri $uri/ /index.html`, proxy reverso `/api/`, compressão `gzip` e headers de cache PWA), `frontend/Dockerfile` (multi-stage Node 20 Alpine $\rightarrow$ Nginx 1.27 Alpine) e `frontend/.dockerignore`
- **Plano de Execução Vinculado:** [PLANO-FASE-7-FRONTEND.md](file:///home/ferreito/SGMS/docs/roadmap/frontend/PLANO-FASE-7-FRONTEND.md)
