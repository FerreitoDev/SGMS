# Template Padrão de Planos de Execução Atômica (`PLANO-FASE-X-*.md`)

> Este template define a estrutura formal e obrigatória para planos atômicos de execução de fase (Nível 3 da hierarquia). Nenhum plano pode ser executado sem atender a esta estrutura.

---

```markdown
# [PROJETO] — Planejamento Detalhado: Fase X ([Nome da Fase])

> **Documento:** Plano de Execução Técnica & Checklist Sequencial da Fase X ([Subtítulo explicativo])  
> **Status:** 🟡 Planejada / Pronta para Execução Atômica (0 de N Tarefas Concluídas)  
> **Módulo:** [Backend / Frontend / Core] ([Stack detalhada: frameworks, bibliotecas e estilos])  
> **Data de Criação:** [DATA]  
> **Fonte da Verdade:** [Lista com links para especificação, regras de negócio, schema de banco e roadmap correspondente]  

---

## 1. Visão Geral e Princípios Operacionais da Entrega

[Descrever em 3 a 5 tópicos densos o objetivo prático da fase, as regras de negócio críticas e os princípios defensivos contra falhas de operação/adoção]:
1. **Regra de Domínio / Negócio:** [Ex: Precisão decimal, lock pessimista ou validação de validade].
2. **Ergonomia e Contrato:** [Ex: Alvo de toque >= 44px, gavetas Sheet, layout em 4 breakpoints].
3. **Integridade de Dados (Zero Fallback):** [Ex: Ausência legítima tratada como null/-; ausência ilegítima como erro explícito].

---

## 2. Matriz de Cobertura de Entidades / Telas / Contratos

| Elemento / Rota | Arquivo / Componente Alvo | Comportamento Operacional / Regra |
| :--- | :--- | :--- |
| `POST /api/v1/...` | `feature.controller.ts` | Validação estrita via DTO, retorno RFC 7807 em caso de erro |
| Tela de Cadastro | `feature-sheet.tsx` | Gaveta Sheet com foco touch-first e validação Zod reativa |

---

## 3. Status Geral da Fase

```
Progresso da Fase X: [--------------------------------] 0% Concluído (0 de N tarefas)
```

| ID | Tarefa | Status | Módulo / Artefatos |
| :---: | :--- | :---: | :--- |
| **X.1** | [Nome da Tarefa 1] | ⏳ Pendente | `caminho/do/arquivo1.ts` |
| **X.2** | [Nome da Tarefa 2] | ⏳ Pendente | `caminho/do/arquivo2.tsx` |
| **X.N** | Auditoria Zero Fallback & Homologação | ⏳ Pendente | Testes, tipos e build verde |

---

## 4. Detalhamento Técnico das Tarefas

---

### ⏳ Tarefa X.1: [Nome da Primeira Tarefa Atômica]
- **Objetivo:** [Explicação em 1-2 frases do que a tarefa constrói e sua mecânica causal].
- **Arquivos a Modificar / Criar:**
  - `caminho/completo/do/arquivo1.ts`
  - `caminho/completo/do/arquivo2.ts`
- **Contratos e Tipagens Envolvidas:**
  - [Assinatura da interface, schema Zod ou DTO esperado com tipagem estrita].
- **Checklist de Execução Detalhado:**
  - [ ] Passo operacional 1 (cirúrgico).
  - [ ] Passo operacional 2.
- **Critérios de Aceite e Verificação Obrigatória:**
  - [ ] **Caminho Normal:** [Comportamento esperado com dados válidos].
  - [ ] **Violação de Contrato:** [Comportamento esperado com dados inválidos ou ausentes — erro explícito, sem fallback].
  - [ ] **Compilabilidade:** `npm run build` e validação estrita de tipos sem erros.

---

### ⏳ Tarefa X.2: [Nome da Segunda Tarefa Atômica]
- **Objetivo:** [Mecânica causal da tarefa].
- **Arquivos a Modificar / Criar:**
  - `caminho/completo/do/arquivo.tsx`
- **Checklist de Execução Detalhado:**
  - [ ] Passo operacional 1.
- **Critérios de Aceite e Verificação Obrigatória:**
  - [ ] Teste do componente/lógica.
  - [ ] Zero erros de compilação.

---

## 5. Auditoria de Zero Fallback e Integridade de Dados

Checklist obrigatório de conformidade com a Diretriz Global:
- [ ] Proibido uso de `|| 0`, `|| ""`, `|| "N/A"`, `?? []` silencioso ou stubs artificiais.
- [ ] Ausência legítima renderizada honestamente (ex: `-`, estado vazio nativo ou `null`).
- [ ] Ausência ilegítima tratada na fronteira com erro explícito preservando contexto e causa original.
- [ ] Saldos reais `0` preservados como número válido e nunca mascarados como ausência.

---

## 6. Homologação Final da Fase e Critérios de Encerramento

- [ ] Teste de ponta a ponta do fluxo da fase.
- [ ] Verificação de responsividade nos 4 breakpoints (Mobile < 640px, sm >= 640px, md >= 768px, lg/xl >= 1024px).
- [ ] Acessibilidade e foco visível validados.
- [ ] Build de produção executado com sucesso (`npm run build`).
```
