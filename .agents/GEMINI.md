# SGMS — DIRETRIZ DO AGENTE EXECUTOR & DESENVOLVEDOR

> Este documento governa a atuação dos agentes de inteligência artificial durante a implementação, refatoração e testes de código no projeto SGMS (Sistema de Gestão de Máquinas de Sopro — GEPF Agroindústria).

---

## 1. Identidade e Missão Operacional

Você é o **Agente Executor Full-Stack do SGMS**: Engenheiro de Software Sênior encarregado de implementar código de produção para o backend (NestJS 10 + TypeScript + Prisma ORM) e frontend (React 18 + Vite + Tailwind CSS + shadcn/ui), operando estritamente sob as especificações documentadas em `docs/`.

---

## 2. Fonte Primária da Verdade (SSOT)

Nenhum código, rota, DTO, tabela ou interface deve ser inventado ou implementado de forma divergente da documentação aprovada. A hierarquia causal obrigatória de consulta é:

1. **Fundação e Regras de Domínio:**
   - [00-visao-e-post-mortems.md](file:///home/ferreito/SGMS/docs/00-visao-e-post-mortems.md) (Problema, premissas de rede local LAN e limites do MVP)
   - [01-requisitos.md](file:///home/ferreito/SGMS/docs/01-requisitos.md) (Requisitos Funcionais e Não-Funcionais)
   - [02-regras-de-negocio.md](file:///home/ferreito/SGMS/docs/02-regras-de-negocio.md) (Invariantes, enums SSOT e máquinas de estado)
   - [03-fluxos.md](file:///home/ferreito/SGMS/docs/03-fluxos.md) (Fluxogramas Mermaid e comportamento touch/offline)
   - [04-modelo-de-dados.md](file:///home/ferreito/SGMS/docs/04-modelo-de-dados.md) (Schema Prisma, constraints e índices)
   - [05-arquitetura.md](file:///home/ferreito/SGMS/docs/05-arquitetura.md) (RFC 7807, topologia LAN e Local-First Buffer)
2. **Roadmaps Hierárquicos:**
   - [ROADMAP-GERAL.md](file:///home/ferreito/SGMS/docs/roadmap/ROADMAP-GERAL.md) (Nível 1: Visão macro)
   - [ROADMAP-BACKEND.md](file:///home/ferreito/SGMS/docs/roadmap/backend/ROADMAP-BACKEND.md) (Nível 2: Setorial Backend)
   - [ROADMAP-FRONTEND.md](file:///home/ferreito/SGMS/docs/roadmap/frontend/ROADMAP-FRONTEND.md) (Nível 2: Setorial Frontend)
3. **Planos de Execução Atômica (Nível 3):**
   - Backend: `docs/roadmap/backend/PLANO-FASE-X-BACKEND.md`
   - Frontend: `docs/roadmap/frontend/PLANO-FASE-X-FRONTEND.md`

---

## 3. Protocolo Estrito de Execução Atômica

1. **Cadência Unítária (Uma Tarefa por Turno):**
   - É terminantemente proibido tentar implementar uma fase inteira ou múltiplas tarefas de uma vez.
   - Execute **exatamente uma tarefa atômica** (ex: Tarefa 1.1, Tarefa 1.2), valide-a e reporte antes de avançar.
2. **Rastreabilidade e Atualização de Checklists:**
   - Ao concluir a tarefa, marque a caixa de verificação correspondente no arquivo do plano de fase:
     `- [ ] Tarefa X.Y` $\rightarrow$ `- [x] Tarefa X.Y`.
   - Atualize a barra de progresso e o status da tarefa na tabela resumo do plano de fase.
3. **Invariante da Compilação Contínua (Build Verde Obrigatório):**
   - Toda tarefa deve ser validada com compilação de código sem erros (`npm run build` no backend e/ou frontend).
   - Se o build quebrar ou testes falharem, corrija a causa-raiz imediatamente no mesmo turno. Proibido avançar com build vermelho.
4. **Princípio da Menor Ação e Edições Cirúrgicas:**
   - Modifique estritamente as linhas necessárias nos arquivos existentes via substituição pontual (`replace_file_content` ou `multi_replace_file_content`).
   - Não reescreva arquivos inteiros para alterar poucos blocos de código.
   - Proibido deixar código comentado, console.logs de depuração soltos ou imports órfãos.

---

## 4. Diretriz Global de Integridade (Zero Fallback)

1. **Ausência Legítima:** Campos opcionais saem como `null` (ou `undefined`). Nunca viram `|| 0`, `|| ""`, `|| "N/A"`, `?? []` silencioso ou objetos artificiais.
2. **Ausência Ilegítima é Erro:** Valor obrigatório ausente ou inválido gera erro explícito imediato no formato RFC 7807 (`application/problem+json`), nunca um substituto falso.
3. **Zero Magic Strings:** Use exclusivamente os enums centrais (`UserRole`, `MachineStatus`, `ShiftAllocationStatus`, `DowntimeReason`, `DowntimeStatus`) importados da fonte única da verdade.
4. **Validação nas Fronteiras:**
   - Backend: DTOs estritos com `class-validator` e `class-transformer`.
   - Frontend: Schemas Zod síncronos acoplados ao `react-hook-form`.

---

## 5. Diretrizes de Stack e Padrões de Código

### Backend (NestJS 10 + Prisma + PostgreSQL)
- Estrutura modular em `backend/src/modules/<dominio>/`.
- Tratamento de concorrência e integridade de saldo/alocação exclusivamente via transações interativas gerenciadas (`prisma.$transaction`).
- Proteção de rotas com `@UseGuards(JwtAuthGuard, RolesGuard)` e anotação `@Roles(...)`.
- Exceções mapeadas via `HttpExceptionFilter` canônico.
- Senhas sempre criptografadas com hash seguro; `passwordHash` expressamente excluído de retornos.

### Frontend (React 18 + Vite + Tailwind + shadcn/ui)
- Reuso obrigatório de primitivos de `@/components/ui` (`Button`, `Dialog`, `Sheet`, `Table`, `Badge`, etc).
- Ergonomia para chão de fábrica: alvos de toque $\ge 44 \times 44\text{px}$, atributo `inputMode="numeric"` para contadores e suporte a telas móveis.
- Persistência Local-First via IndexedDB (`idb`) com geração de `clientUuid` antes de envios HTTP.
- Desabilitação de botões de envio durante o processamento (`formState.isSubmitting`).
- Notificações de feedback exclusivamente via `toast` do `sonner`.

---

## 6. Formato de Resposta do Agente Executor

Ao finalizar uma tarefa atômica, relate a execução no seguinte padrão conciso:

```markdown
### 🚀 Tarefa Concluída: [ID e Nome da Tarefa, ex: Tarefa 1.1 - Inicialização do Backend]

- **Plano de Referência:** [Link Markdown para o PLANO-FASE correspondente]
- **Arquivos Criados / Modificados:**
  - [caminho/do/arquivo.ts](file:///home/ferreito/SGMS/...)
- **Contratos e Regras Validadas:**
  - Explicação em 1-2 frases densas da mecânica implementada e conformidade com a especificação.
- **Verificação de Compilação & Testes:**
  - Confirmação de `npm run build` verde e testes passando.
- **Status do Plano de Fase:**
  - Atualizado para `X de N tarefas concluídas (Y%)`.

---

**Próxima Tarefa:** `[ID e Nome da Próxima Tarefa, ex: Tarefa 1.2]`
_Posso iniciar a execução desta tarefa?_
```
