# SGMS — Sistema de Gestão de Máquinas de Sopro
## `docs/01-requisitos.md`

---

### 1. Escopo e Atores do Sistema

| Ator | Dispositivo Típico | Responsabilidade Primária |
| :--- | :--- | :--- |
| **Operador** | Smartphone / Tablet no chão de fábrica | Assume máquina no turno, lança contagem de garrafas sopradas e aponta paradas (em tempo real ou retroativo). Opera com resiliência a quedas de energia/rede via fila local. |
| **Gerente de Produção** | Desktop / Computador de escritório | Cadastra máquinas, turnos e contas de operadores; monitora o painel de gargalos; extrai relatórios em CSV e PDF; possui acesso supervisor a todas as funções operacionais. |

---

### 2. Matriz de Requisitos Funcionais (RF)

| ID | Nome do Requisito | Descrição Técnica & Critérios de Sucesso | Entradas | Saídas |
| :--- | :--- | :--- | :--- | :--- |
| **RF-01** | Autenticação e Perfis (RBAC) | Autentica usuários via credenciais seguras (usuário/e-mail e senha). Gera token JWT contendo perfil (`GERENTE` ou `OPERADOR`). Segregação estrita de rotas no frontend: `OPERADOR` acessa exclusivamente telas de chão de fábrica (`/chao-de-fabrica/*`); `GERENTE` é direcionado exclusivamente ao painel gerencial/administrativo (`/admin/*`), sem herdar rotas de operador de sessões anteriores após logout. | Usuário/E-mail, Senha | Token JWT, Perfil, Redirecionamento isolado por papel |
| **RF-02** | Gestão de Contas de Operadores | Permite ao Gerente cadastrar, listar, editar e desativar contas de operadores. Desativação revoga permissão de login sem deletar histórico de apontamentos passados. | Nome, Login, Senha, Status (Ativo/Inativo) | Registro do Operador criado/atualizado |
| **RF-03** | Cadastro de Máquinas de Sopro | Permite ao Gerente cadastrar, editar e inativar máquinas de sopro do parque fabril. Cada máquina possui identificador fabril (código/tag), modelo e status operacional. | Código/Tag (ex: `SOPRO-01`), Descrição/Modelo, Status | Registro da Máquina persistido |
| **RF-04** | Cadastro de Turnos de Trabalho | Permite ao Gerente cadastrar e configurar turnos de trabalho definindo nome, horário planejado de início e horário planejado de término. | Nome (ex: `Turno A - Manhã`), Início (`HH:mm`), Término (`HH:mm`) | Registro do Turno persistido |
| **RF-05** | Alocação Exclusiva Máquina-Turno | Operador assume a operação de uma máquina de sopro em um turno ativo. O sistema impede que outro operador assuma simultaneamente a mesma máquina no mesmo turno (regra de exclusividade operacional 1:1). | `machineId`, `shiftId`, `operatorId`, Data do Turno | Alocação confirmada ou Erro 409 (Conflito de alocação) |
| **RF-06** | Apontamento de Produção de Garrafas | Operador registra a contagem de garrafas sopradas para a máquina no turno. Permite lançamentos avulsos ou de hora em hora para composição da curva de produtividade. Valor deve ser número inteiro positivo. | `machineAllocationId`, Quantidade de Garrafas, Timestamp | Registro de produção gravado com sucesso |
| **RF-07** | Registro de Paradas de Máquina | Operador aponta eventos de parada através de um gatilho único ("Registrar Parada de Linha") vinculando: motivo da lista padronizada (incluindo pausa planejada `REFEICAO_INTERVALO`), timestamp de início e timestamp de término. Se motivo for `OUTROS`, campo de justificativa textual torna-se estritamente obrigatório. | Motivo (`PRE_FORMA`, `COMPRESSOR`, `AQUECIMENTO_FORNO`, `MOLDE`, `MECANICA`, `ELETRICA`, `REFEICAO_INTERVALO`, `OUTROS`), Timestamp Início, Timestamp Fim, Justificativa (obrigatória se `OUTROS`) | Registro de Parada criado |
| **RF-08** | Lançamento Tempo Real Travado vs. Retroativo Editável | Na aba **Tempo Real (Agora)** de registro de parada, o timestamp de início é fixado no instante atual e bloqueado contra edição manual. Na aba **Lançamento Retroativo** (e no apontamento de produção), o formulário disponibiliza campos de data/hora editáveis para inserção de eventos passados dentro da janela do turno alocado. | Modo de lançamento (`Tempo Real` travado ou `Retroativo` ajustado pelo operador) | Evento registrado com carimbo de tempo histórico e carimbo de auditoria de inserção |
| **RF-09** | Fila Offline e Sincronização Local | Em caso de perda de conexão local (queda de energia/Wi-Fi), a interface salva eventos no IndexedDB local com identificador UUID v4. Ao restabelecer a rede com o servidor, sincroniza a fila via requisição idempotente em lote ou sequencial. | Fila local de eventos em IndexedDB | Eventos persistidos no banco central; fila local limpa com feedback visual |
| **RF-10** | Painel de Monitoramento de Gargalos | Exibe status consolidado em tempo real: status atual de cada máquina (Operando, Parada), contagem acumulada de garrafas no turno, disponibilidade operacional líquida (descontando `REFEICAO_INTERVALO` do tempo planejado) e ranking Pareto de motivos de parada não planejadas (excluindo `REFEICAO_INTERVALO`). | Filtro de Turno / Data / Máquina | Gráficos e indicadores de produção e indisponibilidade sem distorção por pausas de refeição |
| **RF-11** | Extração de Relatórios (CSV e PDF) | Permite ao Gerente filtrar dados de produção e paradas por período, máquina, turno e operador, exportando arquivo CSV estruturado e arquivo PDF com layout corporativo limpo para impressão/arquivamento. | Período (Início/Fim), `machineId`, `shiftId`, `operatorId`, Formato (`CSV` ou `PDF`) | Arquivo binário (`text/csv` ou `application/pdf`) para download |

---

### 3. Matriz de Requisitos Não-Funcionais (RNF)

| ID | Categoria | Especificação Técnica & Critério de Aceite |
| :--- | :--- | :--- |
| **RNF-01** | **Integridade (Zero Fallback)** | Ausência de dado obrigatório rejeitada na fronteira com erro RFC 7807 (400 Bad Request / 422 Unprocessable Entity). Campos opcionais são propagados como `null` ou `undefined`; proibido o uso de substitutos silenciosos (`|| 0`, `|| ""`, `?? []`). |
| **RNF-02** | **Topologia Local (On-Premise / LAN)** | Todo o ecossistema (backend NestJS, frontend SPA/PWA e banco relacional PostgreSQL) é executado fisicamente na rede local da GEPF. Zero requisições a serviços externos de cloud pública; funcionamento pleno sem internet. |
| **RNF-03** | **Ergonomia e Alvos de Toque** | Interface touch otimizada para smartphones e tablets no chão de fábrica. Alvos de clique $\ge 44 \times 44\text{px}$, teclados virtuais orientados (`inputmode="numeric"` para quantidades) com supressão obrigatória de setas incrementais (`spinners`) e proibição de botões de adição rápida (`+50`, `+100`, etc.) para evitar indução ao erro. |
| **RNF-04** | **Idempotência de Sincronização** | Todo evento gerado no cliente recebe identificador unívoco UUID v4 na criação local antes do envio HTTP. O backend rejeita duplicidades sem corromper saldos acumulados de garrafas ou dobrar tempos de parada. |
| **RNF-05** | **Desempenho e Latência Local** | Em rede local (Wi-Fi 2.4/5GHz ou cabo), endpoints transacionais de apontamento devem responder em tempo $\le 100\text{ms}$ (percentil 95). Geração de relatórios PDF de até 500 registros processada em $\le 3\text{s}$. |
| **RNF-06** | **Compatibilidade e Arquitetura PWA** | Web app compatível com navegadores Chromium (Android) e Safari (iOS/iPadOS). Registro de Service Worker para cache de assets estáticos e manifesto PWA para instalação direta como atalho na tela inicial sem APK. |
| **RNF-07** | **Segurança de Acesso e Isolamento** | Senhas de operadores e gerentes com hash criptográfico seguro (Argon2 ou Bcrypt). Rotas protegidas por Guards NestJS validando JWT assinado com chave simétrica local. |
