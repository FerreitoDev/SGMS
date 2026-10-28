# SGMS — Planejamento Detalhado: Fase 5 (Frontend)

> **Documento:** Plano de Execução Técnica & Checklist Sequencial da Fase 5 (Unificação do Gatilho de Paradas, Travamento Temporal, Input Numérico Puro & Isolamento RBAC)  
> **Status:** 🟡 Em Progresso (3 de 4 Tarefas Concluídas — 75%)  
> **Módulo:** Frontend (React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui + Zod)  
> **Data de Criação:** 2026-10-28  
> **Fonte da Verdade:** [01-requisitos.md](file:///home/ferreito/SGMS/docs/01-requisitos.md) | [02-regras-de-negocio.md](file:///home/ferreito/SGMS/docs/02-regras-de-negocio.md) | [03-fluxos.md](file:///home/ferreito/SGMS/docs/03-fluxos.md) | [ROADMAP-FRONTEND.md](file:///home/ferreito/SGMS/docs/roadmap/frontend/ROADMAP-FRONTEND.md)  

---

## 1. Visão Geral e Princípios Operacionais da Entrega

1. **Gatilho Único de Parada no Console Operacional (`RF-07`):** Remove-se o botão secundário tracejado `"Lançar Parada Ocorrida Anteriormente (Retroativa)"` da tela principal (`OperatorConsolePage`), eliminando a duplicidade visual. O botão `"Registrar Parada de Linha"` passa a ser a porta única para o painel `Sheet`, que já contém as abas **Tempo Real (Agora)** e **Lançamento Retroativo**.
2. **Imutabilidade de Horário no Modo Tempo Real (`RF-08`, `RN-09`):** Quando a aba **Tempo Real (Agora)** estiver ativa no `DowntimeModal`, o operador não pode editar a data nem a hora de início — o horário é fixado automaticamente no instante da confirmação (`new Date().toISOString()`) e exibido apenas como informativo travado. Os campos editáveis `datetime-local` de **Início da Parada** e **Término da Parada** são exibidos exclusivamente quando a aba **Lançamento Retroativo** estiver selecionada.
3. **Input Numérico Puro sem Botões de Adição Rápida e sem Spinners (`RF-06`, `RNF-03`):** São banidos os botões de adição rápida (`+50`, `+100`, `+250`, `+500`) e removidas as setas incrementais nativas (`spinners` do input `type="number"`) no `ProductionDrawer`, evitando cliques acidentais e erros de soma no chão de fábrica.
4. **Isolamento Estrito de Rotas entre Operador e Gerente (`RF-01`):** Ao fazer logout de uma conta `OPERADOR` e logar como `GERENTE`, o `ProtectedRoute` e a `LoginPage` não devem reaproveitar o `location.state.from` (`/chao-de-fabrica/...`) da sessão anterior, e as rotas `/chao-de-fabrica/*` passam a exigir `requiredRole="OPERADOR"`, garantindo que o Gerente vá sempre para `/admin/dashboard` e nunca caia nas telas operacionais de chão de fábrica.

---

## 2. Matriz de Cobertura de Telas / Componentes / Contratos

| Componente / Arquivo | Caminho Alvo | Perfil Permitido | Comportamento Operacional / Regra |
| :--- | :--- | :---: | :--- |
| Tipos de Domínio | `frontend/src/types/domain.ts` | Global | Adiciona `'REFEICAO_INTERVALO'` ao union type `DowntimeReason` |
| Schema & Labels de Parada | `frontend/src/schemas/downtime-schema.ts` | Operacional | Adiciona `'REFEICAO_INTERVALO'` em `DOWNTIME_REASONS` e `'Refeição / Intervalo'` em `DOWNTIME_LABELS` |
| Console do Operador | `frontend/src/pages/operator/operator-console-page.tsx` | `OPERADOR` | Remove o botão redundante de parada retroativa e exibe o label amigável do motivo na parada ativa |
| Gaveta de Paradas (`Sheet`) | `frontend/src/components/downtime/downtime-modal.tsx` | `OPERADOR` | Trava o horário de início no modo **Tempo Real (Agora)** e libera edição de Início/Fim apenas no **Lançamento Retroativo** |
| Gaveta de Produção (`Sheet`) | `frontend/src/components/production/production-drawer.tsx` | `OPERADOR` | Remove a seção `"Adição rápida"` (`+50` a `+500`) e oculta as setas incrementais (`spinners`) do input numérico |
| Rotas & Autenticação | `frontend/src/routes/app-routes.tsx`, `frontend/src/components/auth/protected-route.tsx`, `frontend/src/pages/login-page.tsx` | `OPERADOR` / `GERENTE` | Restringe `/chao-de-fabrica/*` a `OPERADOR`, `/admin/*` a `GERENTE` e redireciona sempre para a home do respectivo papel no login |

---

## 3. Status Geral da Fase

```
Progresso da Fase 5 (Frontend): [========================--------] 75% Concluído (3 de 4 tarefas)
```

| ID | Tarefa | Status | Módulo / Artefatos |
| :---: | :--- | :---: | :--- |
| **5.1** | Inclusão de `REFEICAO_INTERVALO` nos Contratos, Schema Zod & Labels | 🟢 Concluída | `frontend/src/types/domain.ts`, `frontend/src/schemas/downtime-schema.ts`, `frontend/src/pages/operator/operator-console-page.tsx` |
| **5.2** | Remoção do Botão Redundante & Travamento de Data/Hora no Tempo Real (`RN-09`) | 🟢 Concluída | `frontend/src/pages/operator/operator-console-page.tsx`, `frontend/src/components/downtime/downtime-modal.tsx` |
| **5.3** | Remoção dos Botões de Adição Rápida & Setas (`Spinners`) em `ProductionDrawer` | 🟢 Concluída | `frontend/src/components/production/production-drawer.tsx` |
| **5.4** | Isolamento Estrito de Rotas RBAC (`OPERADOR` vs `GERENTE`) no Login e Rotas | ⚪ A Iniciar | `frontend/src/routes/app-routes.tsx`, `frontend/src/components/auth/protected-route.tsx`, `frontend/src/pages/login-page.tsx` |

---

## 4. Detalhamento Técnico das Tarefas

---

### 🟢 Tarefa 5.1: Inclusão de `REFEICAO_INTERVALO` nos Contratos, Schema Zod & Labels
- **Objetivo:** Atualizar o tipo `DowntimeReason`, a constante `DOWNTIME_REASONS` e o mapa `DOWNTIME_LABELS` no frontend para contemplar a parada planejada de refeição/almoço e exibir rótulos legíveis no console.
- **Arquivos a Modificar / Criar:**
  - `frontend/src/types/domain.ts`
  - `frontend/src/schemas/downtime-schema.ts`
  - `frontend/src/pages/operator/operator-console-page.tsx`
- **Checklist de Execução Detalhado:**
  - [x] Adicionar `'REFEICAO_INTERVALO'` ao type `DowntimeReason` em `frontend/src/types/domain.ts`
  - [x] Adicionar `'REFEICAO_INTERVALO'` ao array `DOWNTIME_REASONS` e mapear `REFEICAO_INTERVALO: 'Refeição / Intervalo'` em `DOWNTIME_LABELS` (`frontend/src/schemas/downtime-schema.ts`)
  - [x] Em `OperatorConsolePage`, exibir `DOWNTIME_LABELS[activeDowntime.reason]` no card de status quando a máquina estiver parada
- **Critérios de Aceite e Verificação Obrigatória:**
  - [x] **Caminho Normal:** O botão `"Refeição / Intervalo"` aparece na grade touch de motivos e pode ser selecionado sem exigir justificativa textual.
  - [x] **Zero Fallback:** Tipagem estrita garantida entre `DowntimeReason` e `DOWNTIME_LABELS` sem `any` ou fallback silencioso.

---

### 🟢 Tarefa 5.2: Remoção do Botão Redundante & Travamento de Data/Hora no Tempo Real (`RN-09`)
- **Objetivo:** Eliminar o botão secundário `"Lançar Parada Ocorrida Anteriormente (Retroativa)"` da tela principal do operador e bloquear a edição de data/hora quando a aba **Tempo Real (Agora)** estiver selecionada no `DowntimeModal`.
- **Arquivos a Modificar / Criar:**
  - `frontend/src/pages/operator/operator-console-page.tsx`
  - `frontend/src/components/downtime/downtime-modal.tsx`
- **Checklist de Execução Detalhado:**
  - [x] Em `OperatorConsolePage`: remover o botão `<Button variant="outline">...Lançar Parada Ocorrida Anteriormente (Retroativa)</Button>`, o estado `isDowntimeRetroactive` desnecessário e o ícone `History` órfão, ajustando o grid de ações primárias
  - [x] Em `DowntimeModal`:
    - [x] Quando `!isRetroactive` (aba **Tempo Real (Agora)**): substituir o `<Input type="datetime-local" />` editável por um bloco informativo travado mostrando que o início será registrado no instante exato da confirmação (`Agora`), e no `onSubmit` usar `new Date().toISOString()` diretamente como `startTimeIso` para o modo tempo real
    - [x] Quando `isRetroactive` (aba **Lançamento Retroativo**): renderizar os dois inputs `<Input type="datetime-local" />` editáveis (**Início da Parada** e **Término da Parada**)
- **Critérios de Aceite e Verificação Obrigatória:**
  - [x] **Caminho Normal (Tempo Real):** Ao clicar em `"Registrar Parada de Linha"`, a aba **Tempo Real (Agora)** está ativa e não permite alterar dia ou hora; basta tocar no motivo e confirmar.
  - [x] **Caminho Retroativo:** Ao alternar para a aba **Lançamento Retroativo** dentro do mesmo `Sheet`, os campos de Início e Término aparecem habilitados para edição com validação $T_{fim} \ge T_{ini}$.

---

### 🟢 Tarefa 5.3: Remoção dos Botões de Adição Rápida & Setas (`Spinners`) em `ProductionDrawer`
- **Objetivo:** Remover completamente os botões de adição rápida (`+50`, `+100`, `+250`, `+500`) e ocultar as setas de incremento/decremento (`spinners`) do input numérico de produção.
- **Arquivos a Modificar / Criar:**
  - `frontend/src/components/production/production-drawer.tsx`
- **Checklist de Execução Detalhado:**
  - [x] Remover a função `handleIncrement`, a variável `currentQuantity = watch('quantity')`, o bloco JSX de `"Adição rápida"` (`[50, 100, 250, 500].map(...)`) e o import não utilizado `Sparkles` (e `setValue`, `watch` caso não usados em outro lugar)
  - [x] No `<Input id="production-quantity-input" type="number" ... />`, adicionar as classes Tailwind `[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none` e `onWheel={(e) => e.currentTarget.blur()}` para remover as setinhas visuais e impedir alteração acidental por scroll
- **Critérios de Aceite e Verificação Obrigatória:**
  - [x] **Caminho Normal:** Gaveta de produção exibe apenas o campo numérico limpo (sem setas laterais e sem botões `+50`/`+100`) e o campo de horário.
  - [x] **Prevenção de Erro:** Rolagem do mouse sobre o input ou cliques na borda direita do input não alteram o valor digitado.

---

### ⬜ Tarefa 5.4: Isolamento Estrito de Rotas RBAC (`OPERADOR` vs `GERENTE`) no Login e Rotas
- **Objetivo:** Impedir que o usuário `GERENTE` caia em telas de `OPERADOR` (`/chao-de-fabrica/*`) ao trocar de conta ou navegar, garantindo redirecionamento determinístico por perfil.
- **Arquivos a Modificar / Criar:**
  - `frontend/src/routes/app-routes.tsx`
  - `frontend/src/components/auth/protected-route.tsx`
  - `frontend/src/pages/login-page.tsx`
- **Checklist de Execução Detalhado:**
  - [ ] Em `frontend/src/routes/app-routes.tsx`: separar as rotas `/chao-de-fabrica/alocacao` e `/chao-de-fabrica/console` dentro de um `<Route element={<ProtectedRoute requiredRole="OPERADOR" />}>` próprio, deixando apenas `<Route path="/" element={<HomeRedirect />} />` no `<ProtectedRoute />` genérico
  - [ ] Em `frontend/src/components/auth/protected-route.tsx`: atualizar o `fallbackPath` de `isRoleInsufficient` para `user.role === 'GERENTE' ? '/admin/dashboard' : '/chao-de-fabrica/alocacao'`
  - [ ] Em `frontend/src/pages/login-page.tsx`:
    - Alterar o redirect de usuário já autenticado (linha 49) para `user.role === 'GERENTE' ? '/admin/dashboard' : '/chao-de-fabrica/alocacao'`
    - No `onSubmit` (linhas 68-77), validar se `targetFrom` é compatível com o papel do usuário recém-logado (`GERENTE` só aproveita `targetFrom` se começar com `/admin`; `OPERADOR` só aproveita se começar com `/chao-de-fabrica`); caso contrário, redirecionar diretamente para `/admin/dashboard` (se `GERENTE`) ou `/chao-de-fabrica/alocacao` (se `OPERADOR`)
- **Critérios de Aceite e Verificação Obrigatória:**
  - [ ] **Caminho Normal (Troca de Conta):** Ao clicar em "Sair" na tela do Operador (`/chao-de-fabrica/alocacao` ou `/chao-de-fabrica/console`) e fazer login com a conta de `GERENTE`, o sistema abre diretamente `/admin/dashboard` (nunca a tela de Alocação de Sopradora).
  - [ ] **Violação de Rota Cruzada:** Se um `GERENTE` tentar acessar manualmente `/chao-de-fabrica/alocacao`, o `ProtectedRoute` bloqueia e redireciona imediatamente para `/admin/dashboard`.

---

## 5. Auditoria de Zero Fallback & Homologação da Fase 5 (Frontend)
- [ ] Nenhum import não utilizado (`History`, `Sparkles`, estados órfãos) deixado nos componentes modificados.
- [ ] `npm run build` no frontend executando com zero erros de TypeScript e zero warnings de bundle.
