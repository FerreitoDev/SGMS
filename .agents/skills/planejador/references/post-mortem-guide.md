# Guia de Pesquisa & Autópsia de Negócios e Produtos Análogos

> Este documento orienta o Agente Planejador na investigação prévia durante a fase de ideação (concepção do zero ou novas grandes verticais). O objetivo é entender por que outros fracassaram antes de propor soluções de negócio ou arquitetura.

---

## 1. Princípio Fundamental: Anti-SEO & Triangulação

Projetos e startups falham por fricção operacional, modelos insustentáveis, complexidade excessiva e rejeição de usuários. Materiais institucionais e artigos patrocinados ocultam essas fraquezas. O Planejador deve buscar os **termos de atrito**.

### 1.1 Operadores de Busca Anti-SEO
Ao pesquisar o domínio do problema ou concorrentes, utilize combinações com:
- `"[produto/nicho]" + "why it failed" OR "post mortem" OR "shutdown" OR "startup failure"`
- `"[categoria de software]" + "churn" OR "por que voltaram para o excel" OR "baixa adesão"`
- `"[categoria de software]" + "maiores reclamações" OR "resistência dos operadores" OR "gargalo operacional"`
- `"[ferramenta similar]" + alternative OR "switching from" OR "drawbacks" OR "limitations"`

---

## 2. As Quatro Causas-Raiz de Fracasso de Negócio

Durante a investigação, classifique as descobertas em quatro categorias para extrair lições defensivas:

### A. Fricção de Adoção e Ergonomia (A Morte por Burocracia)
- **Sintoma comum:** O software exige mais passos e tempo do que o processo manual anterior (caderno, planilha, mensagem).
- **Causa raiz:** Interfaces pensadas para desktop de escritório impostas a operadores de chão de fábrica, smartphones industriais ou rotinas aceleradas; campos obrigatórios irrelevantes; falta de feedback touch imediato.
- **Contra-medida no Planejamento:** Fluxos em no máximo 2 a 3 passos, alvos de toque $\ge 44\text{px}$, suporte a coletores/telas pequenas e eliminação de telas intermediárias supérfluas.

### B. Incompatibilidade com Exceções do Mundo Real
- **Sintoma comum:** O software trava a operação quando algo fora da regra padrão acontece (ex.: material avariado, produto sem código de barras, devolução física sem nota fiscal pronta).
- **Causa raiz:** Arquitetura ingênua que modela apenas o "caminho feliz" e trata exceções operacionais como anomalias impeditivas.
- **Contra-medida no Planejamento:** Modelagem explícita de máquinas de estado que comportam exceções físicas, devoluções, perdas e retrabalhos sem travar a cadeia produtiva.

### C. Sobrecarga de Treinamento e Dependência de Suporte
- **Sintoma comum:** Clientes abandonam o sistema nos primeiros 90 dias porque a equipe não conseguiu assimilar o funcionamento sem treinamento constante.
- **Causa raiz:** Vocabulário excessivamente técnico, ausência de pistas visuais de ação e fluxos ramificados confusos.
- **Contra-medida no Planejamento:** Filosofia da Simplicidade Radical ("Menos é Mais"), termos comuns da operação do cliente em vez de jargões técnicos de TI.

### D. Complexidade Acidental & Custo Operacional Desproporcional
- **Sintoma comum:** O custo de computação, licença de terceiros ou manutenção de dados complexos supera o ganho tangível gerado para o negócio.
- **Causa raiz:** Premature optimization, microserviços prematuros, dependência de múltiplos bancos de dados ou provedores pagos desnecessários para a escala factual do cliente.
- **Contra-medida no Planejamento:** Arquitetura monolítica modular limpa, banco relacional único e uso de componentes acessíveis e consolidados.

---

## 3. Síntese Obrigatória em `docs/00-visao-e-post-mortems.md`

Toda autópsia de negócios deve ser resumida na documentação de ideação na seguinte tabela:

| Projeto / Solução Análoga | Motivo Factual do Fracasso / Rejeição | Vulnerabilidade de Negócio Identificada | Princípio Defensivo Adotado no Nosso Projeto |
| :--- | :--- | :--- | :--- |
| Exemplo A | Complexidade excessiva de cadastro | Operadores abandonaram o app por demora | Cadastro simplificado em 1 gaveta com 3 campos vitais |
| Exemplo B | Travamento por regras rígidas de estoque | Bloqueava expedição em divergências de lote | Tolerância operacional com ajuste assíncrono auditado |
