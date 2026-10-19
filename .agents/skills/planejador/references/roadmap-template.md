# Padrão de Estruturação de Roadmaps Hierárquicos

> Este guia estabelece os contratos e a formatação obrigatória dos roadmaps (`ROADMAP-GERAL.md`, `ROADMAP-BACKEND.md` e `ROADMAP-FRONTEND.md`). Todo roadmap no projeto deve conter requisitos e checklists auditáveis.

---

## 1. Hierarquia de Dependência Imutável

```
ROADMAP-GERAL.md (Nível 1 - Macro Fases do Produto)
      │
      ├──► ROADMAP-BACKEND.md (Nível 2 - Fases Técnicas de Backend)
      │         │
      │         └──► PLANO-FASE-N-BACKEND.md (Nível 3 - Execução Atômica)
      │
      └──► ROADMAP-FRONTEND.md (Nível 2 - Fases Técnicas de Frontend)
                │
                └──► PLANO-FASE-N-FRONTEND.md (Nível 3 - Execução Atômica)
```

**Regra de Ouro:** Não existe Plano de Fase sem fase correspondente no roadmap técnico setorial; não existe fase no roadmap técnico setorial sem macro-fase registrada no `ROADMAP-GERAL.md`.

---

## 2. Template: `ROADMAP-GERAL.md` (Nível 1)

```markdown
# [PROJETO] — Roadmap Geral Integrado

> **Status Geral do Projeto:** 🟡 Em Desenvolvimento (Fase X em Andamento)  
> **Fonte da Verdade:** `docs/00` a `docs/08`  
> **Última Atualização:** [DATA]

---

## 1. Visão Macro de Fases

| Fase | Título da Fase | Módulos Envolvidos | Status | Requisitos Cobertos |
| :---: | :--- | :--- | :---: | :--- |
| **1** | Fundação e Autenticação | Backend + Frontend | 🟢 Concluída | RF-01, RF-02, RNF-01 |
| **2** | Cadastro Base e Estoque | Backend + Frontend | 🟡 Em Andamento | RF-03 a RF-06 |

---

## 2. Detalhamento das Fases

### Fase X: [Título da Fase]
- **Objetivo Estratégico:** [Explicação em 1-2 frases do valor de negócio gerado]
- **Requisitos Associados:**
  - `RF-XX`: [Descrição curta do requisito funcional]
  - `RNF-YY`: [Descrição curta do requisito não-funcional]
- **Checklist Macro de Entregas:**
  - [ ] Implementação do Modelo de Dados & Migrations
  - [ ] Módulo Backend e APIs de Integração
  - [ ] Telas e Fluxos Operacionais no Frontend
  - [ ] Homologação Integrada e Testes de Aceite
- **Critérios de Conclusão da Fase:** [Condições objetivas para marcar a fase como concluída]
```

---

## 3. Template: Roadmaps Técnicos Setoriais (`ROADMAP-BACKEND.md` / `ROADMAP-FRONTEND.md`) (Nível 2)

```markdown
# [PROJETO] — Roadmap Técnico: [Backend / Frontend]

> **Fase Geral Correspondente:** Fase X do `ROADMAP-GERAL.md`  
> **Status:** 🟡 Planejamento Ativo  
> **Última Atualização:** [DATA]

---

## 1. Matriz de Fases e Planos Vinculados

| Fase Setorial | Título da Entrega Técnica | Plano de Execução Detalhado | Status |
| :---: | :--- | :--- | :---: |
| **Fase X** | [Nome da Entrega] | [PLANO-FASE-X-SETOR.md](./PLANO-FASE-X-SETOR.md) | 🟡 Planejada |

---

## 2. Detalhamento da Fase Setorial

### Fase X: [Título da Entrega Técnica]
- **Referência Hierárquica:** Fase X de `ROADMAP-GERAL.md`.
- **Requisitos Técnicos e de Negócio:**
  - `RF-XX`: [Regra de negócio ou funcionalidade atendida]
  - `RNF-YY`: [Desempenho, concorrência, acessibilidade ou contrato]
- **Dependências Bloqueantes:** [Se depende de migrations, de APIs externas ou de rotas backend prévias]
- **Checklist Técnico Sequencial:**
  - [ ] X.1: [Primeira frente de trabalho técnica]
  - [ ] X.2: [Segunda frente de trabalho técnica]
  - [ ] X.N: [Auditoria de conformidade, build verde e testes]
- **Plano de Execução Vinculado:** `docs/roadmap/[setor]/PLANO-FASE-X-[SETOR].md`
```
