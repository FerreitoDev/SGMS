# SGMS — Sistema de Gestão de Máquinas de Sopro
## `docs/00-visao-e-post-mortems.md`

---

### 1. Declaração do Problema Real

- **Contexto Operacional:** A GEPF Agroindústria opera máquinas de sopro para produção de garrafas PET em linha de envase de água mineral. O apontamento da produção física e das paradas de linha é executado manualmente em cadernos de papel no chão de fábrica.
- **Dor Econômica e Operacional:** 
  1. Atraso na consolidação: dados ficam retidos no papel até o encerramento do turno ou do dia, impedindo que a gerência detecte gargalos térmicos, mecânicos ou de suprimento de pré-formas em tempo hábil.
  2. Imprecisão de motivos: anotações ilegíveis ou incompletas no caderno geram dados não auditáveis, distorcendo o cálculo de disponibilidade e produtividade.
  3. Perda de dados por sinistros físicos: cadernos no chão de fábrica sofrem extravio, sujeira e perda de anotações.
- **Público Atingido:**
  - **Operadores de Linha:** Sofrem com burocracia de escrita manual durante paradas de emergência, sem confirmação de recebimento dos dados.
  - **Gerência de Produção:** Sem visibilidade consolidada de gargalos, dependente de digitação manual secundária em planilhas para tomada de decisão.

---

### 2. Proposta de Valor do SGMS

O SGMS é uma solução web *responsive/mobile-first* (PWA) de arquitetura limpa e corporativa hospedada 100% em rede local (on-premise / LAN), projetada para substituir integralmente o caderno físico por apontamentos digitais imediatos em celular/tablet e fornecer ao gerente de produção controle centralizado, dashboards e extração de relatórios (CSV e PDF) em desktop, operando com total autonomia sem depender de conexão com a internet externa.

---

### 3. Autópsia de Sistemas Análogos & Vulnerabilidades de Negócio

| Solução / Abordagem Análoga | Causa-Raiz do Fracasso ou Rejeição | Vulnerabilidade Factual Identificada | Princípio Defensivo Adotado no SGMS |
| :--- | :--- | :--- | :--- |
| **Sistemas OEE de Chão de Fábrica Genéricos** | Categoria "Outros" vira depósito de 50%+ das paradas devido a listas confusas. | O operador sob estresse mecânico escolhe a opção mais rápida, anulando a análise de Pareto. | Lista seletiva de motivos objetivos pré-cadastrados. A opção "Outros" exige texto explicativo obrigatório validado no formulário. |
| **Apps Nativos (APK/Play Store)** | Dependência de compilação, instalação manual em dispositivos pessoais/industriais e bloqueios de atualização. | Atrito na manutenção de versões de APK nos dispositivos do galpão; atualizações quebram o fluxo de produção. | Arquitetura Web PWA pura, sem APK. Acesso via navegador na rede local com suporte a Service Worker / cache e atalho na tela inicial. |
| **Sistemas Dependentes de Rede Contínua** | Queda de sinal Wi-Fi ou energia interrompe a aplicação e apaga dados digitados no formulário. | Operador perde o lançamento e abandona o software, retornando ao papel. | Persistência local obrigatória em IndexedDB. Todo apontamento recebe UUID no cliente e sincroniza com idempotência ao restabelecer a conexão com o servidor local. |
| **Sistemas em Nuvem (Cloud/SaaS) no Agro/Indústria** | Oscilações do link de internet da fábrica travam o carregamento e geram custos recorrentes. | Perda de produtividade no chão de fábrica por instabilidade de provedor externo. | Deploy 100% on-premise em rede local (LAN). O servidor e banco rodam fisicamente na planta fabril da GEPF. |
| **Formulários Rígidos em Tempo Real** | O sistema impõe o horário corrente sem permitir correções de minutos anteriores. | Operador prioriza destravar a máquina física e só consegue registrar a parada 20 minutos depois, gerando dados falsos de horário. | Apontamento pré-carrega o horário local do sistema, mas disponibiliza edição retroativa de timestamp antes da confirmação. |

---

### 4. Princípios Defensivos do Projeto

1. **Simplicidade Radical no Chão de Fábrica:** Alvos de toque $\ge 44\text{px}$, contraste corporativo *clean*, fluxo de apontamento concluído em no máximo 2 ações.
2. **Exclusividade Operacional por Máquina e Turno:** Cada máquina de sopro possui exatamente um operador responsável por turno ativo, prevenindo lançamentos concorrentes e inconsistências de responsabilidade.
3. **Resiliência a Quedas de Conexão e Energia (Zero Data Loss):** Apontamentos e métricas horárias são persistidos no armazenamento local seguro do navegador (IndexedDB) antes do disparo de rede, assegurando integridade mesmo sob desligamento súbito.
4. **Independência de Internet Externa (Operação 100% On-Premise/LAN):** A aplicação e o banco residem na rede local da fábrica. A ausência de link externo de internet não afeta apontamentos, relatórios ou persistência.
5. **Zero Fallback e Validação Rígida:** Nenhuma parada sem motivo, nenhuma produção com valor nulo disfarçado de zero (`null` propaga como `null`; valor obrigatório ausente gera erro imediato de validação).

---

### 5. Limites Estritos do Escopo (O que o MVP NÃO Fará)

- **Sem Dependência de Nuvem Pública (Cloud/SaaS):** A solução roda inteiramente em servidor local na rede da fábrica, eliminando custos de nuvem e vulnerabilidade a quedas de link externo.
- **Sem Integração IoT/CLP:** Nenhum protocolo industrial físico (OPC-UA, Modbus, MQTT) na versão 1. A entrada é humana e declaratória.
- **Sem Aplicativo Nativo (Sem APK / IPA):** Nenhuma distribuição via Google Play Store ou Apple App Store; distribuição 100% web PWA via IP/domínio local.
- **Sem Módulo de Manutenção Preventiva/CMMS:** O SGMS não gerencia ordens de serviço complexas, estoque de peças sobressalentes ou planos de lubrificação de máquinas.
- **Sem Cálculo de Custos Financeiros / DRE:** O sistema mensura unidades físicas (garrafas), tempos de parada e motivos, sem conversão em valores monetários (R$).
- **Sem Notificações Push Externas (SMS/WhatsApp):** O monitoramento ocorre na interface do sistema pelo gerente e operador na LAN.
