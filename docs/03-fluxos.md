# SGMS — Sistema de Gestão de Máquinas de Sopro
## `docs/03-fluxos.md`

---

### 1. Fluxo de Autenticação e Alocação de Máquina no Turno

O operador acessa a interface no smartphone ou tablet e vincula sua sessão à máquina de sopro no início da jornada:

```mermaid
sequenceDiagram
    autonumber
    actor Operador as Operador (Mobile/Tablet)
    participant UI as Interface PWA
    participant API as Backend NestJS
    participant DB as Banco PostgreSQL

    Operador->>UI: Informa login e senha
    UI->>API: POST /api/auth/login { username, password }
    API->>DB: Busca usuário e valida hash de senha
    DB-->>API: Usuário validado (Role: OPERADOR)
    API-->>UI: Retorna JWT { sub, role, name }
    UI->>UI: Armazena JWT em storage seguro

    Operador->>UI: Seleciona Máquina (ex: SOPRO-01) e Turno
    UI->>API: POST /api/allocations { machineId, shiftId, shiftDate }
    API->>DB: Verifica se existe alocação ACTIVE para a máquina e turno
    alt Máquina já alocada por outro operador (RN-01)
        DB-->>API: Registro existente encontrado
        API-->>UI: Erro 409 Conflict ("Máquina já alocada")
        UI-->>Operador: Alerta visual com dados do conflito
    else Máquina desimpedida
        API->>DB: Cria ShiftAllocation (ACTIVE) e atualiza MachineStatus para RUNNING
        DB-->>API: Alocação criada com sucesso
        API-->>UI: Confirmação 201 Created { allocationId, machineStatus: "RUNNING" }
        UI-->>Operador: Painel de operação da máquina liberado
    end
```

---

### 2. Fluxo de Apontamento Rápido de Produção (Touch em Chão de Fábrica)

O operador aponta o volume de garrafas sopradas na hora em que desejar ou de hora em hora para monitoramento de ritmo:

```mermaid
sequenceDiagram
    autonumber
    actor Operador as Operador (Mobile/Tablet)
    participant UI as Interface PWA
    participant LocalDB as IndexedDB (Dispositivo)
    participant API as Backend NestJS
    participant DB as Banco PostgreSQL

    Operador->>UI: Toca em "+ Produção" (Alvo Touch >= 44px)
    UI->>UI: Abre gaveta com teclado numérico nativo do Android/iOS e horário atual pré-preenchido
    Operador->>UI: Digita quantidade de garrafas (ex: 2400) e confirma ou edita horário
    UI->>UI: Valida quantidade > 0 e gera clientUuid (v4)
    UI->>LocalDB: Grava apontamento localmente (Status: PENDING_SYNC)
    
    alt Conexão com a rede local está ativa
        UI->>API: POST /api/productions { clientUuid, allocationId, quantity, timestamp }
        API->>DB: Insere registro em production_entries (idempotente por clientUuid)
        DB-->>API: Produção persistida
        API-->>UI: Resposta 201 Created
        UI->>LocalDB: Atualiza status do registro para SYNCED
        UI-->>Operador: Toast de sucesso instantâneo (ex: "2.400 garrafas registradas")
    else Queda de Wi-Fi ou Servidor Local Inacessível
        UI-->>Operador: Confirmação visual em modo offline ("Salvo no dispositivo")
    end
```

---

### 3. Fluxo de Apontamento de Paradas de Máquina (Gatilho Único no Console)

O Console Operacional possui um **único botão de ação para paradas** (`"Registrar Parada de Linha"`), eliminando botões secundários redundantes na tela principal. Ao tocar nele, abre-se o painel `Sheet` com duas abas: **Tempo Real (Agora)** e **Lançamento Retroativo**.

#### 3.1 Aba "Tempo Real (Agora)" (Horário Travado e Fechamento Posterior)

```mermaid
sequenceDiagram
    autonumber
    actor Operador as Operador
    participant UI as Interface PWA (Sheet)
    participant API as Backend NestJS
    participant DB as Banco PostgreSQL

    Operador->>UI: Toca no botão único "Registrar Parada de Linha" (Aba padrão: Tempo Real)
    UI->>UI: Exibe motivos (incluindo REFEICAO_INTERVALO) com horário de início TRAVADO no Agora (RN-09)
    Operador->>UI: Seleciona motivo (ex: AQUECIMENTO_FORNO ou REFEICAO_INTERVALO) e confirma
    UI->>API: POST /api/downtimes/start { allocationId, reason, startTime: now() }
    API->>DB: Cria DowntimeRecord (status: IN_PROGRESS) e altera Machine para STOPPED
    DB-->>API: Parada aberta confirmada
    API-->>UI: Interface entra em modo "Máquina Paralisada" (Cronômetro ativo)
    
    Note over Operador, UI: Máquina é reparada ou intervalo de refeição termina
    
    Operador->>UI: Toca em "Retomar Produção"
    UI->>API: PATCH /api/downtimes/:id/resolve { endTime }
    API->>DB: Calcula duração em minutos, atualiza para RESOLVED e Machine para RUNNING
    DB-->>API: Parada encerrada
    API-->>UI: Confirmação 200 OK
    UI-->>Operador: Máquina volta ao status normal RUNNING
```

#### 3.2 Aba "Lançamento Retroativo" (Lançamento de Evento Passado com Início e Fim Editáveis)

```mermaid
flowchart TD
    A["Operador toca em 'Registrar Parada de Linha' e alterna para a aba 'Lançamento Retroativo'"] --> B["Habilita campos editáveis de Data/Hora de Início e Término"]
    B --> C["Operador informa horário de Início e Término ocorridos no passado"]
    C --> D{"T_fim >= T_ini e T_evento <= Agora?"}
    D -- Não --> E["Validação bloqueia envio e exibe alerta de inconsistência cronológica"]
    D -- Sim --> F["Operador seleciona o Motivo da Parada (incluindo REFEICAO_INTERVALO)"]
    F --> G{"Motivo selecionado é 'OUTROS'?"}
    G -- Sim --> H["Campo de texto obrigatório é habilitado (mínimo 5 caracteres)"]
    H --> I["Operador preenche justificativa factual"]
    G -- Não --> J["Campo de justificativa é desabilitado e propagado como null"]
    I --> K["Envio ao backend NestJS (POST /api/downtimes/retroactive)"]
    J --> K
    K --> L["Registro persistido com status RESOLVED e duração calculada"]
```

---

### 4. Fluxo de Resiliência a Queda de Energia e Sincronização Offline (PWA)

O ciclo abaixo garante zero perda de dados em quedas de rede local:

```mermaid
flowchart TD
    subgraph Dispositivo Chão de Fábrica [Dispositivo do Operador - Celular/Tablet]
        A["Operador confirma apontamento"] --> B["Gera clientUuid v4 no frontend"]
        B --> C["Grava objeto no IndexedDB local com status PENDING"]
        C --> D{"Rede Local (Wi-Fi) disponível?"}
        D -- Não (Queda de energia/roteador) --> E["Permanece no IndexedDB seguro"]
        E --> F["Banner persistente: 'X registros aguardando sincronização'"]
        D -- Sim --> G["Envia lote pendente via HTTP POST /api/sync"]
    end

    subgraph Servidor Local On-Premise [Servidor Físico da Fábrica]
        G --> H["Backend recebe payload de sincronização"]
        H --> I["Abre Transação de Banco"]
        I --> J{"clientUuid já existe no banco?"}
        J -- Sim --> K["Descarta duplicação (idempotência preservada)"]
        J -- Não --> L["Grava produção ou parada na tabela definitiva"]
        K --> M["Commit da transação"]
        L --> M
        M --> N["Retorna HTTP 200 com lista de clientUuids processados"]
    end

    N --> O["Frontend atualiza registros no IndexedDB para SYNCED ou remove fila"]
    O --> P["Banner exibe: 'Todos os registros sincronizados com sucesso'"]
```

---

### 5. Fluxo de Fechamento de Turno e Geração de Relatórios (Gerência)

```mermaid
sequenceDiagram
    autonumber
    actor Operador as Operador
    actor Gerente as Gerente de Produção (Desktop)
    participant UI as Interface Desktop/Mobile
    participant API as Backend NestJS
    participant Relatorio as Módulo de Relatórios (CSV/PDF)
    participant DB as Banco PostgreSQL

    Operador->>UI: Revisa totais e clica em "Encerrar Turno"
    UI->>API: POST /api/allocations/:id/close
    API->>DB: Atualiza ShiftAllocation para CLOSED e MachineStatus para IDLE
    DB-->>API: Turno encerrado e congelado para o operador
    API-->>UI: Turno finalizado com sucesso

    Note over Gerente, Relatorio: No escritório, Gerente analisa o desempenho fabril
    
    Gerente->>UI: Acessa tela "Relatórios e Análise de Gargalos"
    Gerente->>UI: Filtra por período (ex: última semana), Máquina e Formato (PDF ou CSV)
    UI->>API: GET /api/reports?startDate=...&machineId=...&format=pdf
    API->>DB: Consulta agregações de volume, paradas e disponibilidade
    DB-->>API: Retorna matriz de dados consolidados
    API->>Relatorio: Compila template corporativo com tabelas e Pareto
    Relatorio-->>API: Gera buffer binário (application/pdf ou text/csv)
    API-->>UI: Transmite download via stream HTTP
    UI-->>Gerente: Arquivo baixado e pronto para análise de gargalos
```
