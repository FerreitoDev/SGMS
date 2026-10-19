# Estrutura Modular Fundacional para Projetos do Zero (`docs/`)

> Este guia estabelece o padrão de documentação para projetos que nascem a partir de uma ideia (estágio de ideação / greenfield).

---

## 1. Arquitetura da Pasta `docs/`

```text
docs/
├── 00-visao-e-post-mortems.md   # Problema, proposta de valor, autópsia de falhas de concorrentes e princípios defensivos
├── 01-requisitos.md            # Escopo do MVP, Requisitos Funcionais (RFs) e Não-Funcionais (RNFs)
├── 02-regras-de-negocio.md     # Políticas de domínio, invariantes, tolerâncias e máquinas de estado
├── 03-fluxos.md                # Fluxogramas operacionais ponta a ponta (Mermaid)
├── 04-modelo-de-dados.md       # Entidades, relacionamentos, dicionário de campos e constraints
├── 05-arquitetura.md           # Padrões arquiteturais, stack tecnológica e padrões de resposta/erro
└── roadmap/
    ├── ROADMAP-GERAL.md        # Fases macro do produto com requisitos e checklists
    ├── backend/
    │   └── ROADMAP-BACKEND.md  # Fases técnicas de backend
    └── frontend/
        └── ROADMAP-FRONTEND.md # Fases técnicas de frontend
```

---

## 2. Conteúdo Mínimo de Cada Documento

### `00-visao-e-post-mortems.md`
- **Problema Real:** Quem sofre, qual a dor econômica/operacional e por que planilhas ou métodos manuais falharam.
- **Autópsia de Negócios Similares:** Tabela com pelo menos 2 a 3 casos de produtos análogos que falharam ou foram abandonados, detalhando as causas reais (atrito de adoção, burocracia, custos, lentidão).
- **Princípios Defensivos do Projeto:** Regras fundamentais adotadas no projeto para neutralizar essas armadilhas conhecidas.
- **Limites Estritos do MVP:** O que o sistema expressamente **NÃO** fará na primeira versão para garantir foco radical.

### `01-requisitos.md`
- **Matriz de Requisitos Funcionais (RF-01 a RF-N):** Cada RF com identificador único, descrição clara, entradas, saídas e critérios mensuráveis de sucesso.
- **Matriz de Requisitos Não-Funcionais (RNF-01 a RNF-N):** Performance, integridade de dados (Zero Fallback), precisão numérica (ex: 3 casas decimais), compatibilidade mobile/touch e segurança (RBAC/JWT).

### `02-regras-de-negocio.md`
- **Invariantes Inegociáveis:** Ex: "Tolerância zero a saldo negativo", "Lotes perecíveis bloqueados após a data de validade".
- **Políticas de Transição de Estado:** Matriz formal indicando estados válidos e proibidos de cada entidade central.

### `03-fluxos.md`
- Diagramas operacionais sequenciais (Mermaid) demonstrando o caminho mais curto e eficiente da operação, com destaque para telas touch e etapas de confirmação rápida.

### `04-modelo-de-dados.md`
- Dicionário completo de tabelas e campos, constraints de integridade referencial, índices para consultas críticas e integridade em nível de banco de dados.
