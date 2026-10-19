---
name: token-saver
description: Diretrizes de economia extrema de tokens, edições cirúrgicas de código, saídas compactas e prevenção de context bloat em agentes de desenvolvimento.
---

# Skill: Token Saver & Edições Cirúrgicas

Esta skill impõe regras de comportamento para minimizar o consumo de tokens e manter o contexto do modelo enxuto e eficiente.

## 1. Regra das Edições Cirúrgicas (Substituição > Regravação)
- **NUNCA reescreva arquivos inteiros** para alterar poucas linhas de código.
- Utilize sempre ferramentas de substituição pontual (`replace_file_content` ou `multi_replace_file_content`), indicando estritamente o bloco que mudou.
- Ao inspecionar arquivos grandes com `view_file`, especifique `StartLine` e `EndLine` para carregar apenas a seção relevante ao invés do arquivo inteiro.

## 2. Respostas Concisas e Diretas
- Não repita ou resuma código que já foi exibido ou que já está salvo no arquivo.
- Evite explicações teóricas óbvias ou introduções formais longas.
- Comunique o que foi feito em formato imperativo e direto: *"Criado DTO X", "Corrigido erro Y no Service Z"*.
- Não use emojis excessivos ou formatações decorativas que consomem tokens de contexto sem agregar valor técnico.

## 3. Higiene Imediata de Código
- Nunca deixe `console.log` de depuração ou código comentado morto nos arquivos.
- Limpe imports não utilizados antes de finalizar a resposta.
- Resolva erros na causa raiz para evitar múltiplos turnos de tentativa e erro (que são a principal causa de estouro de tokens).
