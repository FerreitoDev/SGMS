# SGMS — Roadmap Técnico: Frontend (Nível 2)

> **Fase Geral Correspondente:** [ROADMAP-GERAL.md](file:///home/ferreito/SGMS/docs/roadmap/ROADMAP-GERAL.md)  
> **Status:** 🟡 Planejamento Ativo  
> **Última Atualização:** 2026-10-19  

---

## 1. Matriz de Fases e Planos Vinculados

| Fase Setorial | Título da Entrega Técnica | Plano de Execução Vinculado | Status |
| :---: | :--- | :--- | :---: |
| **Fase 1** | Setup Vite, Design System shadcn/ui, Autenticação & Gestão de Contas | [PLANO-FASE-1-FRONTEND.md](file:///home/ferreito/SGMS/docs/roadmap/frontend/PLANO-FASE-1-FRONTEND.md) | 🟢 Concluída |
| **Fase 2** | Gestão de Máquinas, Turnos & Interface de Alocação Touch | [PLANO-FASE-2-FRONTEND.md](file:///home/ferreito/SGMS/docs/roadmap/frontend/PLANO-FASE-2-FRONTEND.md) | 🟡 Em Andamento |
| **Fase 3** | Console Operacional Touch, Modal de Paradas & Persistência IndexedDB (PWA) | [PLANO-FASE-3-FRONTEND.md](file:///home/ferreito/SGMS/docs/roadmap/frontend/PLANO-FASE-3-FRONTEND.md) | ⚪ A Iniciar |
| **Fase 4** | Fechamento de Turno, Dashboard de Gargalos & Extração de Relatórios | [PLANO-FASE-4-FRONTEND.md](file:///home/ferreito/SGMS/docs/roadmap/frontend/PLANO-FASE-4-FRONTEND.md) | ⚪ A Iniciar |

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
  - [ ] 2.1: Tela administrativa de Máquinas (cadastro de tags `SOPRO-XX`, modelo e toggle de ativação)
  - [ ] 2.2: Tela administrativa de Turnos (horários de início/fim com validação de formato `HH:mm`)
  - [ ] 2.3: Tela de Alocação Mobile para o Operador (cartões grandes com alvos de toque `h-14`)
  - [ ] 2.4: Integração com `POST /api/allocations` e captura de erro 409 exibindo toast explicativo amigável
  - [ ] 2.5: Redirecionamento automático para o Console Operacional da máquina alocada
  - [ ] 2.6: Teste de usabilidade e responsividade em resoluções de smartphone (360x640) e tablet (768x1024)
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
  - [ ] 3.1: Instalação e configuração do `vite-plugin-pwa` e da biblioteca `idb` para IndexedDB
  - [ ] 3.2: Implementação da camada de armazenamento local `OfflineStorage` (tabela `pending_events`)
  - [ ] 3.3: Implementação do hook `useOfflineSync` com monitoramento de conexão e disparo em lote para `/api/sync`
  - [ ] 3.4: Construção do Console do Operador (cabeçalho com máquina ativa, status e badge de conectividade)
  - [ ] 3.5: Componente `ProductionDrawer` usando `Sheet` do shadcn com input `type="number" inputMode="numeric"`
  - [ ] 3.6: Componente `DowntimeModal` com cronômetro em tempo real para paradas ativas e aba para modo retroativo
  - [ ] 3.7: Validação Zod garantindo que o campo `justification` seja obrigatório se motivo for `OUTROS`
  - [ ] 3.8: Simulação física de modo avião/desconexão provando que nenhum apontamento digitado se perde
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
  - [ ] 4.1: Componente de encerramento de turno no Console do Operador com painel Sheet de confirmação irreversível
  - [ ] 4.2: Tela de Dashboard Gerencial para desktop (cards de KPIs: Produção Total, Disponibilidade %, Tempo Parado)
  - [ ] 4.3: Gráfico de Pareto de paradas com `Recharts` ou componentes customizados shadcn
  - [ ] 4.4: Tela de Relatórios com seletores de período (`DateRangePicker`), filtro por Máquina e Turno
  - [ ] 4.5: Mecanismo de download via streaming de blobs binários (`text/csv` e `application/pdf`)
  - [ ] 4.6: Tratamento de loading states e feedback de progresso durante a geração dos relatórios
  - [ ] 4.7: Homologação visual integrada de toda a jornada nos navegadores alvo (Chrome e Safari)
- **Plano de Execução Vinculado:** [PLANO-FASE-4-FRONTEND.md](file:///home/ferreito/SGMS/docs/roadmap/frontend/PLANO-FASE-4-FRONTEND.md)
