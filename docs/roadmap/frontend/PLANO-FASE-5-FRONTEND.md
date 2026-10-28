# SGMS — Planejamento Detalhado: Fase 5 (Frontend)

> **Documento:** Plano de Execução Técnica & Checklist Sequencial da Fase 5 (Unificação do Gatilho de Paradas, Travamento Temporal & Pausa de Refeição)  
> **Status:** ⚪ A Iniciar (0 de 2 Tarefas Concluídas — 0%)  
> **Módulo:** Frontend (React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui + Zod)  
> **Data de Criação:** 2026-10-28  
> **Fonte da Verdade:** [01-requisitos.md](file:///home/ferreito/SGMS/docs/01-requisitos.md) | [02-regras-de-negocio.md](file:///home/ferreito/SGMS/docs/02-regras-de-negocio.md) | [03-fluxos.md](file:///home/ferreito/SGMS/docs/03-fluxos.md) | [ROADMAP-FRONTEND.md](file:///home/ferreito/SGMS/docs/roadmap/frontend/ROADMAP-FRONTEND.md)  

---

## 1. Visão Geral e Princípios Operacionais da Entrega

1. **Gatilho Único de Parada no Console Operacional (`RF-07`):** Remove-se o botão secundário tracejado `"Lançar Parada Ocorrida Anteriormente (Retroativa)"` da tela principal (`OperatorConsolePage`), eliminando a duplicidade visual. O botão `"Registrar Parada de Linha"` passa a ser a porta única para o painel `Sheet`, que já contém as abas **Tempo Real (Agora)** e **Lançamento Retroativo**.
2. **Imutabilidade de Horário no Modo Tempo Real (`RF-08`, `RN-09`):** Quando a aba **Tempo Real (Agora)** estiver ativa no `DowntimeModal`, o operador não pode editar a data nem a hora de início — o horário é fixado automaticamente no instante da confirmação (`new Date().toISOString()`) e exibido apenas como informativo travado. Os campos editáveis `datetime-local` de **Início da Parada** e **Término da Parada** são exibidos exclusivamente quando a aba **Lançamento Retroativo** estiver selecionada.
3. **Suporte ao Motivo `REFEICAO_INTERVALO` (`RN-10`):** O seletor de motivos em grade touch inclui a opção `"Refeição / Intervalo"`, e o card de máquina parada no console exibe o rótulo amigável (`DOWNTIME_LABELS[activeDowntime.reason]`) em vez do código bruto do enum.

---

## 2. Matriz de Cobertura de Telas / Componentes / Contratos

| Componente / Arquivo | Caminho Alvo | Perfil Permitido | Comportamento Operacional / Regra |
| :--- | :--- | :---: | :--- |
| Tipos de Domínio | `frontend/src/types/domain.ts` | Global | Adiciona `'REFEICAO_INTERVALO'` ao union type `DowntimeReason` |
| Schema & Labels de Parada | `frontend/src/schemas/downtime-schema.ts` | Operacional | Adiciona `'REFEICAO_INTERVALO'` em `DOWNTIME_REASONS` e `'Refeição / Intervalo'` em `DOWNTIME_LABELS` |
| Console do Operador | `frontend/src/pages/operator/operator-console-page.tsx` | `OPERADOR`, `GERENTE` | Remove o botão redundante de parada retroativa e exibe o label amigável do motivo na parada ativa |
| Gaveta de Paradas (`Sheet`) | `frontend/src/components/downtime/downtime-modal.tsx` | `OPERADOR`, `GERENTE` | Trava o horário de início no modo **Tempo Real (Agora)** e libera edição de Início/Fim apenas no **Lançamento Retroativo** |

---

## 3. Status Geral da Fase

```
Progresso da Fase 5 (Frontend): [--------------------------------] 0% Concluído (0 de 2 tarefas)
```

| ID | Tarefa | Status | Módulo / Artefatos |
| :---: | :--- | :---: | :--- |
| **5.1** | Inclusão de `REFEICAO_INTERVALO` nos Contratos, Schema Zod & Labels | ⚪ A Iniciar | `frontend/src/types/domain.ts`, `frontend/src/schemas/downtime-schema.ts`, `frontend/src/pages/operator/operator-console-page.tsx` |
| **5.2** | Remoção do Botão Redundante & Travamento de Data/Hora no Tempo Real (`RN-09`) | ⚪ A Iniciar | `frontend/src/pages/operator/operator-console-page.tsx`, `frontend/src/components/downtime/downtime-modal.tsx` |

---

## 4. Detalhamento Técnico das Tarefas

---

### ⬜ Tarefa 5.1: Inclusão de `REFEICAO_INTERVALO` nos Contratos, Schema Zod & Labels
- **Objetivo:** Atualizar o tipo `DowntimeReason`, a constante `DOWNTIME_REASONS` e o mapa `DOWNTIME_LABELS` no frontend para contemplar a parada planejada de refeição/almoço e exibir rótulos legíveis no console.
- **Arquivos a Modificar / Criar:**
  - `frontend/src/types/domain.ts`
  - `frontend/src/schemas/downtime-schema.ts`
  - `frontend/src/pages/operator/operator-console-page.tsx`
- **Checklist de Execução Detalhado:**
  - [ ] Adicionar `'REFEICAO_INTERVALO'` ao type `DowntimeReason` em `frontend/src/types/domain.ts`
  - [ ] Adicionar `'REFEICAO_INTERVALO'` ao array `DOWNTIME_REASONS` e mapear `REFEICAO_INTERVALO: 'Refeição / Intervalo'` em `DOWNTIME_LABELS` (`frontend/src/schemas/downtime-schema.ts`)
  - [ ] Em `OperatorConsolePage`, exibir `DOWNTIME_LABELS[activeDowntime.reason]` no card de status quando a máquina estiver parada
- **Critérios de Aceite e Verificação Obrigatória:**
  - [ ] **Caminho Normal:** O botão `"Refeição / Intervalo"` aparece na grade touch de motivos e pode ser selecionado sem exigir justificativa textual.
  - [ ] **Zero Fallback:** Tipagem estrita garantida entre `DowntimeReason` e `DOWNTIME_LABELS` sem `any` ou fallback silencioso.

---

### ⬜ Tarefa 5.2: Remoção do Botão Redundante & Travamento de Data/Hora no Tempo Real (`RN-09`)
- **Objetivo:** Eliminar o botão secundário `"Lançar Parada Ocorrida Anteriormente (Retroativa)"` da tela principal do operador e bloquear a edição de data/hora quando a aba **Tempo Real (Agora)** estiver selecionada no `DowntimeModal`.
- **Arquivos a Modificar / Criar:**
  - `frontend/src/pages/operator/operator-console-page.tsx`
  - `frontend/src/components/downtime/downtime-modal.tsx`
- **Checklist de Execução Detalhado:**
  - [ ] Em `OperatorConsolePage`: remover o botão `<Button variant="outline">...Lançar Parada Ocorrida Anteriormente (Retroativa)</Button>`, o estado `isDowntimeRetroactive` desnecessário e o ícone `History` órfão, ajustando o grid de ações primárias
  - [ ] Em `DowntimeModal`:
    - Quando `!isRetroactive` (aba **Tempo Real (Agora)**): substituir o `<Input type="datetime-local" />` editável por um bloco informativo travado mostrando que o início será registrado no instante exato da confirmação (`Agora`), e no `onSubmit` usar `new Date().toISOString()` diretamente como `startTimeIso` para o modo tempo real
    - Quando `isRetroactive` (aba **Lançamento Retroativo**): renderizar os dois inputs `<Input type="datetime-local" />` editáveis (**Início da Parada** e **Término da Parada**)
- **Critérios de Aceite e Verificação Obrigatória:**
  - [ ] **Caminho Normal (Tempo Real):** Ao clicar em `"Registrar Parada de Linha"`, a aba **Tempo Real (Agora)** está ativa e não permite alterar dia ou hora; basta tocar no motivo e confirmar.
  - [ ] **Caminho Retroativo:** Ao alternar para a aba **Lançamento Retroativo** dentro do mesmo `Sheet`, os campos de Início e Término aparecem habilitados para edição com validação $T_{fim} \ge T_{ini}$.

---

## 5. Auditoria de Zero Fallback & Homologação da Fase 5 (Frontend)
- [ ] Nenhum import não utilizado (`History`, estados órfãos) deixado em `operator-console-page.tsx`.
- [ ] `npm run build` no frontend executando com zero erros de TypeScript e zero warnings de bundle.

