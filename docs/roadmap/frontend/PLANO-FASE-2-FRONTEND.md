# SGMS — Planejamento Detalhado: Fase 2 (Frontend)

> **Documento:** Plano de Execução Técnica & Checklist Sequencial da Fase 2 (Gestão de Máquinas, Turnos & Interface de Alocação Touch)  
> **Status:** 🟡 Em Execução (3 de 7 Tarefas Concluídas)  
> **Módulo:** Frontend (React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui + React Hook Form + Zod + Axios + Sonner)  
> **Data de Criação:** 2026-10-19  
> **Fonte da Verdade:** [01-requisitos.md](file:///home/ferreito/SGMS/docs/01-requisitos.md) | [02-regras-de-negocio.md](file:///home/ferreito/SGMS/docs/02-regras-de-negocio.md) | [03-fluxos.md](file:///home/ferreito/SGMS/docs/03-fluxos.md) | [05-arquitetura.md](file:///home/ferreito/SGMS/docs/05-arquitetura.md) | [ROADMAP-FRONTEND.md](file:///home/ferreito/SGMS/docs/roadmap/frontend/ROADMAP-FRONTEND.md)  

---

## 1. Visão Geral e Princípios Operacionais da Entrega

1. **Ergonomia Touch de Chão de Fábrica:** A seleção de máquina e turno para o operador no smartphone/tablet deve ser concluída em no máximo dois toques, com cartões de grande área clicável ($\ge 64\text{px}$) e contraste elevado.
2. **Prevenção de Falso Travamento (Verificação Prévia de Alocação):** Ao carregar a tela operacional, o frontend consulta `GET /api/allocations/current`. Se o operador já possuir alocação ativa, é redirecionado instantaneamente para o console da máquina, sem forçá-lo a refazer a seleção.
3. **Tratamento Factual de Concorrência (RN-01):** Tentativas concorrentes de assumir máquina já ocupada capturam o erro RFC 7807 (409 Conflict) e exibem alerta visual explícito sem travamento de tela ou dados corrompidos.
4. **Administração Centralizada para Desktop:** O Gerente de Produção gerencia o parque fabril (sopradoras e turnos) em telas de desktop com tabelas shadcn/ui, badges de status e modais de edição síncronos.

---

## 2. Matriz de Cobertura de Telas / Componentes / Contratos

| Rota / Tela | Componente Alvo | Perfil Permitido | Comportamento Operacional / Regra |
| :--- | :--- | :---: | :--- |
| `/admin/machines` | `frontend/src/pages/admin/machines-page.tsx` | `GERENTE` | Listagem tabular de sopradoras, status badges (`IDLE`, `RUNNING`, etc) e gaveta Sheet de cadastro |
| `/admin/shifts` | `frontend/src/pages/admin/shifts-page.tsx` | `GERENTE` | Listagem e cadastro de turnos de produção com horários `HH:mm` |
| `/chao-de-fabrica/alocacao` | `frontend/src/pages/operator/allocation-page.tsx` | `OPERADOR`, `GERENTE` | Interface touch para o operador selecionar máquina e turno e iniciar jornada |
| `MachineCard` | `frontend/src/components/machines/machine-card.tsx` | Operacional | Cartão touch ($\ge 64\text{px}$) com status visual da máquina (Disponível, Em Uso, Inativa) |
| `MachineSheet` | `frontend/src/components/machines/machine-sheet.tsx` | `GERENTE` | Painel Sheet com formulário Zod para cadastrar/editar código e modelo da sopradora |
| `ShiftSheet` | `frontend/src/components/shifts/shift-sheet.tsx` | `GERENTE` | Painel Sheet com formulário Zod para cadastrar nome e horários do turno |

---

## 3. Status Geral da Fase

```
Progresso da Fase 2 (Frontend): [============--------------------] 43% Concluído (3 de 7 tarefas)
```

| ID | Tarefa | Status | Módulo / Artefatos |
| :---: | :--- | :---: | :--- |
| **2.1** | Tipos TypeScript de Domínio e Clientes de API | ✅ Concluída | `frontend/src/types/domain.ts`, `frontend/src/services/*` |
| **2.2** | Tela Administrativa de Gestão de Máquinas (`MachinesPage`) | ✅ Concluída | `frontend/src/pages/admin/machines-page.tsx` |
| **2.3** | Tela Administrativa de Gestão de Turnos (`ShiftsPage`) | ✅ Concluída | `frontend/src/pages/admin/shifts-page.tsx` |
| **2.4** | Componentes Touch-First (`MachineCard`, `ShiftSelector`) | ⏳ Pendente | `frontend/src/components/machines/*`, `frontend/src/components/shifts/*` |
| **2.5** | Tela de Alocação de Máquina para o Operador (`AllocationPage`) | ⏳ Pendente | `frontend/src/pages/operator/allocation-page.tsx` |
| **2.6** | Tratamento de Conflito 409 e Redirecionamento Automático | ⏳ Pendente | `frontend/src/pages/operator/allocation-page.tsx` |
| **2.7** | Auditoria Zero Fallback, Responsividade Mobile & Build | ⏳ Pendente | Testes visuais e compilação de produção |

---

## 4. Detalhamento Técnico das Tarefas

---

### ✅ Tarefa 2.1: Tipos TypeScript de Domínio e Clientes de API
- **Objetivo:** Declarar os contratos TypeScript estritos das entidades de máquinas, turnos e alocações, e implementar os serviços Axios correspondentes.
- **Arquivos a Modificar / Criar:**
  - `frontend/src/types/domain.ts`
  - `frontend/src/services/machines-service.ts`
  - `frontend/src/services/shifts-service.ts`
  - `frontend/src/services/allocations-service.ts`
- **Contratos e Tipagens Envolvidas:**
  ```typescript
  export type MachineStatus = 'INACTIVE' | 'IDLE' | 'RUNNING' | 'STOPPED';

  export interface Machine {
    id: string;
    code: string;
    name: string;
    model: string | null;
    status: MachineStatus;
    isActive: boolean;
  }

  export interface Shift {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    isActive: boolean;
  }

  export interface ShiftAllocation {
    id: string;
    machineId: string;
    shiftId: string;
    operatorId: string;
    shiftDate: string;
    status: 'ACTIVE' | 'CLOSED';
    openedAt: string;
    closedAt: string | null;
    machine?: Machine;
    shift?: Shift;
  }
  ```
- **Checklist de Execução Detalhado:**
  - [x] Implementar `machinesService.list()`, `create(dto)`, `updateStatus(id, status)`
  - [x] Implementar `shiftsService.list()`, `create(dto)`
  - [x] Implementar `allocationsService.getCurrent()`, `create(dto)`, `release(id)`
- **Critérios de Aceite e Verificação Obrigatória:**
  - [x] **Caminho Normal:** Chamadas de serviço retornam dados fortemente tipados sem uso de `any`.
  - [x] **Zero Fallback:** Campo opcional `model` tipado como `string | null` preservando a ausência do banco.

---

### ✅ Tarefa 2.2: Tela Administrativa de Gestão de Máquinas (`MachinesPage`)
- **Objetivo:** Permitir ao Gerente cadastrar, listar e gerenciar o status do parque de sopradoras industriais.
- **Arquivos a Modificar / Criar:**
  - `frontend/src/pages/admin/machines-page.tsx`
  - `frontend/src/components/machines/machine-sheet.tsx`
  - `frontend/src/schemas/machine-schema.ts`
- **Contratos e Tipagens Envolvidas:**
  ```typescript
  export const machineSchema = z.object({
    code: z.string().trim().min(2, 'Código obrigatório (ex: SOPRO-01).'),
    name: z.string().trim().min(3, 'Nome obrigatório.'),
    model: z.string().trim().optional(),
  });
  export type MachineFormData = z.infer<typeof machineSchema>;
  ```
- **Checklist de Execução Detalhado:**
  - [x] Tabela com colunas: Código, Nome, Modelo, Status Operacional (`Badge`), Ativação e Ações
  - [x] Badges com cores contextuais de status: `RUNNING` (verde), `STOPPED` (vermelho), `IDLE` (azul), `INACTIVE` (cinza)
  - [x] Painel `MachineSheet` para novo cadastro com tratamento de erro 409 em caso de código duplicado
  - [x] Ação de alternar ativação (`isActive`) via switch ou botão
- **Critérios de Aceite e Verificação Obrigatória:**
  - [x] **Caminho Normal:** Cadastro de nova sopradora reflete imediatamente na listagem com toast de sucesso.
  - [x] **Violação de Contrato:** Código duplicado exibe alerta de conflito em toast sem quebrar a tela.

---

### ✅ Tarefa 2.3: Tela Administrativa de Gestão de Turnos (`ShiftsPage`)
- **Objetivo:** Permitir ao Gerente configurar a grade de turnos de trabalho da fábrica com horários de início e término.
- **Arquivos a Modificar / Criar:**
  - `frontend/src/pages/admin/shifts-page.tsx`
  - `frontend/src/components/shifts/shift-sheet.tsx`
  - `frontend/src/schemas/shift-schema.ts`
- **Contratos e Tipagens Envolvidas:**
  ```typescript
  export const shiftSchema = z.object({
    name: z.string().trim().min(2, 'Nome do turno obrigatório.'),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato deve ser HH:mm.'),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato deve ser HH:mm.'),
  });
  ```
- **Checklist de Execução Detalhado:**
  - [x] Tabela com colunas: Nome do Turno, Horário Início, Horário Término, Duração Prevista e Status
  - [x] Painel `ShiftSheet` com inputs formatados para `HH:mm`
  - [x] Validação síncrona com Zod antes do envio HTTP
- **Critérios de Aceite e Verificação Obrigatória:**
  - [x] **Caminho Normal:** Turno cadastrado aparece na grade com horários formatados.
  - [x] **Violação de Contrato:** Horário inválido (ex: `27:00`) bloqueado com mensagem no input.

---

### ⏳ Tarefa 2.4: Componentes Touch-First (`MachineCard`, `ShiftSelector`)
- **Objetivo:** Criar os componentes reutilizáveis de seleção rápida para operadores de chão de fábrica, otimizados para toque com smartphones e tablets.
- **Arquivos a Modificar / Criar:**
  - `frontend/src/components/machines/machine-card.tsx`
  - `frontend/src/components/shifts/shift-card.tsx`
- **Checklist de Execução Detalhado:**
  - [ ] `MachineCard`: Altura mínima de 80px, cantos arredondados, indicação clara de código (`SOPRO-01`) em destaque, status visual e feedback de seleção (borda ativa)
  - [ ] Se a máquina estiver com `status = RUNNING` (ocupada por outro operador) ou `INACTIVE`, desabilitar clique e exibir badge "Em Uso" / "Inativa"
  - [ ] `ShiftCard`: Cartão compacto exibindo nome do turno e faixa horária (`06:00 - 14:00`)
  - [ ] Classe utilitária `touch-manipulation` para eliminar atraso de 300ms em toques móveis
- **Critérios de Aceite e Verificação Obrigatória:**
  - [ ] **Caminho Normal:** Toque no cartão alterna estado de seleção visual imediatamente.
  - [ ] **Ergonomia:** Alvo de clique atende plenamente ao critério $\ge 44 \times 44\text{px}$.

---

### ⏳ Tarefa 2.5: Tela de Alocação de Máquina para o Operador (`AllocationPage`)
- **Objetivo:** Construir o fluxo operacional do operador: ao entrar no sistema, o operador escolhe a sopradora desimpedida, o turno e confirma a alocação.
- **Arquivos a Modificar / Criar:**
  - `frontend/src/pages/operator/allocation-page.tsx`
  - `frontend/src/routes/app-routes.tsx`
- **Checklist de Execução Detalhado:**
  - [ ] Carregar lista de máquinas ativas e turnos ativos em paralelo (`Promise.all`)
  - [ ] Grade responsiva de cartões: 1 coluna em mobile (<640px), 2 colunas em tablets/desktop
  - [ ] Data do turno inicializada automaticamente com a data corrente (`YYYY-MM-DD`)
  - [ ] Botão inferior fixo em barra touch: "Assumir [Código da Máquina]" (desabilitado se máquina não selecionada)
  - [ ] Ao clicar, disparar `allocationsService.create({ machineId, shiftId, shiftDate })`
- **Critérios de Aceite e Verificação Obrigatória:**
  - [ ] **Caminho Normal:** Alocação criada com sucesso redireciona o operador para `/chao-de-fabrica/console`.

---

### ⏳ Tarefa 2.6: Tratamento de Conflito 409 e Redirecionamento Automático
- **Objetivo:** Blindar a interface do operador contra disputas de alocação e evitar redundância caso já haja sessão em andamento.
- **Arquivos a Modificar / Criar:**
  - `frontend/src/pages/operator/allocation-page.tsx`
  - `frontend/src/hooks/use-current-allocation.ts`
- **Checklist de Execução Detalhado:**
  - [ ] Criar hook `useCurrentAllocation` que consome `GET /api/allocations/current`
  - [ ] Se houver alocação `ACTIVE`, redirecionar imediatamente para o console da máquina alocada com toast informativo ("Retomando operação da SOPRO-01")
  - [ ] Na submissão de nova alocação, se a API responder HTTP 409 Conflict:
    - Capturar o `detail` do RFC 7807
    - Disparar `toast.error("Máquina já alocada por outro operador.")`
    - Atualizar a lista de máquinas para refletir o status `RUNNING` na máquina disputada
- **Critérios de Aceite e Verificação Obrigatória:**
  - [ ] **Caminho Normal:** Operador que já possui alocação é conduzido diretamente à operação sem telas intermediárias.
  - [ ] **Violação de Concorrência:** Disputa simultânea exibe toast explicativo e impede avanço indevido.

---

### ⏳ Tarefa 2.7: Auditoria Zero Fallback, Responsividade Mobile & Build
- **Objetivo:** Validar a conformidade de tipos, ausência de valores mágicos, ergonomia touch nos 4 breakpoints e build verde de produção.
- **Arquivos a Inspecionar:**
  - `frontend/src/**/*`
- **Checklist de Execução Detalhado:**
  - [ ] Inspecionar componentes e assegurar zero fallbacks arbitrários (`|| ""` ou `|| 0`)
  - [ ] Validar responsividade em viewport de celular (360px) simulando operação com uma mão
  - [ ] Validar responsividade em viewport de tablet (768px)
  - [ ] Executar `npm run build` e validar compilação sem erros
- **Critérios de Aceite e Verificação Obrigatória:**
  - [ ] `npm run build` finalizado com sucesso sem warnings de tipagem.
  - [ ] Navegação completa entre Telas Administrativas e Tela de Alocação sem erros de console.

---

## 5. Auditoria de Zero Fallback e Integridade de Dados

- [ ] Modelo de sopradora ausente exibido explicitamente como traço `-`, nunca omitido silenciosamente ou mascarado com texto falso.
- [ ] Erros de concorrência e validação da API extraídos fielmente do payload RFC 7807 e exibidos em toasts.
- [ ] Prevenção de duplo clique em botões de confirmação de alocação através de flag de loading reativa.
- [ ] Proibido o uso de `any` em estados de componentes e contratos de serviços.

---

## 6. Homologação Final da Fase e Critérios de Encerramento

- [ ] Gerente cadastra máquinas e turnos com sucesso na interface de desktop.
- [ ] Operador visualiza sopradoras disponíveis e assume uma máquina via smartphone/tablet.
- [ ] Conflito de concorrência (dois operadores clicando na mesma máquina) testado com bloqueio visual do segundo.
- [ ] Build estrito de produção executado com sucesso (`npm run build`).
