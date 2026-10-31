# SGMS — Planejamento Detalhado: Fase 6 (Frontend)

> **Documento:** Plano de Execução Técnica & Checklist Sequencial da Fase 6 (Resolução de Bugs Críticos: UUID v4 em Rede Local LAN HTTP, Lista de Últimos Lançamentos, Bloqueio de Máquina `STOPPED` e Integridade Zero Fallback)  
> **Status:** ⚪ A Iniciar (0 de 3 Tarefas Concluídas — 0%)  
> **Módulo:** Frontend (React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui + IndexedDB)  
> **Data de Criação:** 2026-10-28  
> **Fonte da Verdade:** [06-auditoria-bugs-e-inconsistencias.md](file:///home/ferreito/SGMS/docs/06-auditoria-bugs-e-inconsistencias.md) | [02-regras-de-negocio.md](file:///home/ferreito/SGMS/docs/02-regras-de-negocio.md) | [ROADMAP-FRONTEND.md](file:///home/ferreito/SGMS/docs/roadmap/frontend/ROADMAP-FRONTEND.md)  

---

## 1. Visão Geral e Princípios Operacionais da Entrega

1. **Geração de UUID v4 em Rede Local LAN HTTP (`BUG-01` / `RNF-02`):** Substituir a dependência exclusiva de `crypto.randomUUID()` (que falha em origens HTTP de rede local como `http://192.168.x.x:5173` por exigir `[SecureContext]`) por um gerador RFC 4122 v4 baseado em `crypto.getRandomValues()`, garantindo que o apontamento funcione em qualquer tablet, celular ou desktop na LAN.
2. **Visibilidade Imediata em `"ÚLTIMOS LANÇAMENTOS DO TURNO"` e Retomada de Produção (`BUG-02` e `BUG-04`):** Ordenar os lançamentos do mais recente para o mais antigo (`desc`) para que todo novo apontamento apareça imediatamente no topo da lista (mesmo após o 5º registro), exibir itens pendentes no buffer local e corrigir o payload offline e tratamento de erro de `handleResolveDowntime`.
3. **Bloqueio de Máquina `STOPPED` na Alocação e Zero Fallback (`BUG-03` e `BUG-06`):** Impedir que máquinas com status `STOPPED` (em parada ativa por outro operador) apareçam como disponíveis para alocação, remover o texto fictício `'Modelo Padrão'` do Dashboard Gerencial e exibir erros da API inline dentro do `DowntimeModal`.

---

## 2. Matriz de Cobertura de Componentes / Arquivos

| Componente / Arquivo | Caminho Alvo | Bugs Cobertos | Comportamento Operacional / Regra |
| :--- | :--- | :---: | :--- |
| `OfflineStorage` | `frontend/src/lib/offline-storage.ts` | `BUG-01` | Gera UUID v4 compatível com LAN HTTP via `crypto.getRandomValues` quando `crypto.randomUUID` não estiver disponível |
| `OperatorConsolePage` | `frontend/src/pages/operator/operator-console-page.tsx` | `BUG-02`, `BUG-04` | Exibe os 5 lançamentos mais recentes (ordem decrescente + pendentes offline) e corrige `handleResolveDowntime` |
| `MachineCard` & `AllocationPage` | `frontend/src/components/machines/machine-card.tsx`, `frontend/src/pages/operator/allocation-page.tsx` | `BUG-03`, `BUG-06` | Permite alocar apenas máquinas `IDLE` (`isActive && status === 'IDLE'`) e distingue erro 409 de outros erros |
| `ManagerDashboardPage` & `DowntimeModal` | `frontend/src/pages/admin/dashboard-page.tsx`, `frontend/src/components/downtime/downtime-modal.tsx` | `BUG-06` | Substitui `'Modelo Padrão'` por `'Modelo não informado'` e exibe erro da API inline no `Sheet` de paradas |

---

## 3. Status Geral da Fase

```
Progresso da Fase 6 (Frontend): [--------------------------------] 0% Concluído (0 de 3 tarefas)
```

| ID | Tarefa | Status | Módulo / Artefatos |
| :---: | :--- | :---: | :--- |
| **6.1** | Gerador UUID v4 Compatível com LAN HTTP em `OfflineStorage` (`BUG-01`) | ⚪ Pendente | `frontend/src/lib/offline-storage.ts` |
| **6.2** | Ordenação Decrescente + Buffer em `"ÚLTIMOS LANÇAMENTOS"` (`BUG-02`) & Retomada de Produção (`BUG-04`) | ⚪ Pendente | `frontend/src/pages/operator/operator-console-page.tsx` |
| **6.3** | Bloqueio de Máquina `STOPPED` na Alocação (`BUG-03`), Zero Fallback no Dashboard & Erro Inline em `DowntimeModal` (`BUG-06`) | ⚪ Pendente | `frontend/src/components/machines/machine-card.tsx`, `frontend/src/pages/operator/allocation-page.tsx`, `frontend/src/pages/admin/dashboard-page.tsx`, `frontend/src/components/downtime/downtime-modal.tsx` |

---

## 4. Detalhamento Técnico das Tarefas

---

### ⬜ Tarefa 6.1: Gerador UUID v4 Compatível com LAN HTTP em `OfflineStorage` (`BUG-01`)
- **Objetivo:** Garantir que `OfflineStorage.generateUuid()` nunca lance `TypeError: crypto.randomUUID is not a function` quando a aplicação for acessada via endereço IP da rede local (`http://192.168.x.x:5173`).
- **Arquivos a Modificar:**
  - `frontend/src/lib/offline-storage.ts`
- **Checklist de Execução Detalhado:**
  - [ ] Em `OfflineStorage.generateUuid()`:
    - [ ] Verificar se `typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'`; caso positivo, retornar `crypto.randomUUID()`
    - [ ] Caso contrário (contexto HTTP de rede local LAN), gerar 16 bytes aleatórios com `crypto.getRandomValues(new Uint8Array(16))`, aplicar os bits de versão 4 (`bytes[6] = (bytes[6] & 0x0f) | 0x40`) e variante RFC 4122 (`bytes[8] = (bytes[8] & 0x3f) | 0x80`) e formatar no padrão canônico `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`
- **Critérios de Aceite e Verificação Obrigatória:**
  - [ ] **Caminho Normal:** Apontamentos de produção e paradas funcionam identicamente tanto em `http://localhost:5173` quanto em `http://<IP_DA_LAN>:5173`, gerando UUID v4 aceito por `@IsUUID('4')` no backend.

---

### ⬜ Tarefa 6.2: Ordenação Decrescente + Buffer em `"ÚLTIMOS LANÇAMENTOS"` (`BUG-02`) & Retomada de Produção (`BUG-04`)
- **Objetivo:** Exibir sempre os apontamentos mais recentes no topo do card `"ÚLTIMOS LANÇAMENTOS DO TURNO"` (incluindo itens pendentes no buffer local) e corrigir o fluxo de resolução de parada ativa (`handleResolveDowntime`).
- **Arquivos a Modificar:**
  - `frontend/src/pages/operator/operator-console-page.tsx`
- **Checklist de Execução Detalhado:**
  - [ ] Em `OperatorConsolePage`:
    - [ ] Ordenar a exibição de lançamentos de produção em ordem decrescente de timestamp (`[...productions].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5)`) e incluir os apontamentos pendentes no buffer offline da alocação atual para que todo novo lançamento apareça imediatamente no topo
    - [ ] Em `handleResolveDowntime`: se `downtimesService.resolve` lançar `ProblemDetailsError` com `status > 0`, exibir `toast.error(extractProblemDetail(err))` e não gravar no buffer offline; apenas em falha de conectividade (`status === 0`), gravar no `OfflineStorage` com payload completo (`allocationId`, `reason: activeDowntime.reason`, `justification: activeDowntime.justification`, `startTime: activeDowntime.startTime`, `endTime: resolvedAt`) e notificar sincronização
- **Critérios de Aceite e Verificação Obrigatória:**
  - [ ] **Caminho Normal (`BUG-02`):** Ao realizar o 6º, 7º ou N-ésimo apontamento no turno, ele aparece imediatamente na 1ª posição de `"ÚLTIMOS LANÇAMENTOS DO TURNO"` e incrementa o total acumulado.

---

### ⬜ Tarefa 6.3: Bloqueio de Máquina `STOPPED` na Alocação (`BUG-03`), Zero Fallback no Dashboard & Erro Inline em `DowntimeModal` (`BUG-06`)
- **Objetivo:** Impedir seleção de máquina em parada ativa (`STOPPED`) na tela de alocação, eliminar o fallback `'Modelo Padrão'` no Dashboard Gerencial e exibir mensagens de erro da API diretamente dentro da gaveta `DowntimeModal`.
- **Arquivos a Modificar:**
  - `frontend/src/components/machines/machine-card.tsx`
  - `frontend/src/pages/operator/allocation-page.tsx`
  - `frontend/src/pages/admin/dashboard-page.tsx`
  - `frontend/src/components/downtime/downtime-modal.tsx`
- **Checklist de Execução Detalhado:**
  - [ ] Em `MachineCard` (`machine-card.tsx`) e no contador de disponíveis de `AllocationPage` (`allocation-page.tsx`): alterar a condição de disponibilidade para `machine.isActive && machine.status === 'IDLE'`, bloqueando o clique em máquinas com status `STOPPED` (exibindo badge `"Parada (Em Uso)"`)
  - [ ] Em `AllocationPage.handleConfirmAllocation`: marcar localmente a máquina como `'RUNNING'` somente quando o erro for `MACHINE_ALREADY_ALLOCATED` (HTTP 409); nos demais erros, exibir a descrição real retornada pela API
  - [ ] Em `ManagerDashboardPage` (`dashboard-page.tsx`): substituir `'Modelo Padrão'` por `'Modelo não informado'` quando `machine.model` for `null`
  - [ ] Em `DowntimeModal` (`downtime-modal.tsx`): adicionar estado `apiError: string | null` e renderizar o alerta de erro dentro do formulário do `Sheet` caso a chamada HTTP retorne `ProblemDetailsError`
- **Critérios de Aceite e Verificação Obrigatória:**
  - [ ] **Caminho Normal:** Máquinas `STOPPED` ficam bloqueadas na tela de alocação; `SOPRO-04` exibe `'Modelo não informado'` no Dashboard; `npm --prefix frontend run build` compila sem erros.

