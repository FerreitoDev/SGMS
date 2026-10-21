# SGMS — Planejamento Detalhado: Fase 3 (Frontend)

> **Documento:** Plano de Execução Técnica & Checklist Sequencial da Fase 3 (Console Operacional Touch, Modal de Paradas & Persistência IndexedDB / PWA)  
> **Status:** 🟡 Em Andamento (1 de 7 Tarefas Concluídas — 14%)  
> **Módulo:** Frontend (React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui + idb + vite-plugin-pwa + Zod + Sonner)  
> **Data de Criação:** 2026-10-19  
> **Fonte da Verdade:** [01-requisitos.md](file:///home/ferreito/SGMS/docs/01-requisitos.md) | [02-regras-de-negocio.md](file:///home/ferreito/SGMS/docs/02-regras-de-negocio.md) | [03-fluxos.md](file:///home/ferreito/SGMS/docs/03-fluxos.md) | [05-arquitetura.md](file:///home/ferreito/SGMS/docs/05-arquitetura.md) | [ROADMAP-FRONTEND.md](file:///home/ferreito/SGMS/docs/roadmap/frontend/ROADMAP-FRONTEND.md)  

---

## 1. Visão Geral e Princípios Operacionais da Entrega

1. **Padrão Local-First Buffer (Zero Perda em Quedas de Rede/Energia):** Todo apontamento de garrafas ou ocorrência de parada gera um `clientUuid` v4 e é gravado no IndexedDB antes de qualquer tentativa de transmissão HTTP. Se a rede local falhar ou a energia cair, o dado permanece retido no dispositivo do operador.
2. **PWA Instalável sem APK:** A aplicação utiliza Service Worker via `vite-plugin-pwa` para manter em cache todo o código HTML, JS, CSS, fontes e ícones. O operador instala o atalho na tela inicial do celular/tablet sem transitar por lojas de aplicativos.
3. **Ergonomia de Toque em Chão de Fábrica:** Abertura de formulários via gavetas touch inferiores (`Sheet`), teclado numérico nativo forçado (`inputMode="numeric"`) e botões de ação com alvos táteis generosos ($\ge 44\text{px}$).
4. **Validação Reativa de Qualidade:** O modal de parada exige obrigatoriamente justificativa textual com no mínimo 5 caracteres quando o motivo for `OUTROS`, desabilitando o campo para os demais motivos.

---

## 2. Matriz de Cobertura de Telas / Componentes / Contratos

| Rota / Tela | Componente Alvo | Perfil Permitido | Comportamento Operacional / Regra |
| :--- | :--- | :---: | :--- |
| `/chao-de-fabrica/console` | `frontend/src/pages/operator/operator-console-page.tsx` | `OPERADOR`, `GERENTE` | Painel principal de controle da máquina com contadores, botões táteis e status de conexão |
| `ProductionDrawer` | `frontend/src/components/production/production-drawer.tsx` | Operacional | Gaveta touch bottom com teclado numérico nativo e horário pré-preenchido editável |
| `DowntimeModal` | `frontend/src/components/downtime/downtime-modal.tsx` | Operacional | Modal com cronômetro em tempo real para parada ativa e aba para modo retroativo |
| `SyncBadge` | `frontend/src/components/sync/sync-badge.tsx` | Operacional | Indicador de conectividade com contador de eventos pendentes no IndexedDB |
| `OfflineStorage` | `frontend/src/lib/offline-storage.ts` | Global | Camada cliente de persistência em IndexedDB utilizando a biblioteca `idb` |

---

## 3. Status Geral da Fase

```
Progresso da Fase 3 (Frontend): [========================--------] 86% Concluído (6 de 7 tarefas)
```

| ID | Tarefa | Status | Módulo / Artefatos |
| :---: | :--- | :---: | :--- |
| **3.1** | Configuração PWA, Service Worker & Manifesto Web | 🟢 Concluída | `frontend/vite.config.ts`, `frontend/public/manifest.json` |
| **3.2** | Camada de Armazenamento Offline IndexedDB (`idb`) | 🟢 Concluída | `frontend/src/lib/offline-storage.ts`, `frontend/src/types/offline.ts` |
| **3.3** | Hook de Sincronização Automática (`useOfflineSync`) | 🟢 Concluída | `frontend/src/hooks/use-offline-sync.ts`, `frontend/src/components/sync/sync-badge.tsx` |
| **3.4** | Console Operacional do Chão de Fábrica (`OperatorConsolePage`) | 🟢 Concluída | `frontend/src/pages/operator/operator-console-page.tsx`, `frontend/src/components/operator/*` |
| **3.5** | Gaveta Touch de Apontamento de Garrafas (`ProductionDrawer`) | 🟢 Concluída | `frontend/src/components/production/*`, `frontend/src/schemas/production-schema.ts` |
| **3.6** | Modal de Paradas em Tempo Real e Retroativas (`DowntimeModal`) | 🟢 Concluída | `frontend/src/components/downtime/*`, `frontend/src/schemas/downtime-schema.ts` |
| **3.7** | Auditoria Zero Fallback, Simulação Offline & Build | ⏳ Pendente | Testes de desconexão e compilação de produção |

---

## 4. Detalhamento Técnico das Tarefas

---

### ✅ Tarefa 3.1: Configuração PWA, Service Worker & Manifesto Web
- **Objetivo:** Transformar a SPA em um Progressive Web App (PWA) instalável diretamente na rede local sem gerar arquivos APK, garantindo cache offline completo dos assets estáticos.
- **Arquivos a Modificar / Criar:**
  - `frontend/vite.config.ts`
  - `frontend/public/manifest.json`
  - `frontend/public/icons/icon-192x192.png`
  - `frontend/public/icons/icon-512x512.png`
  - `frontend/public/icons/icon.svg`
  - `frontend/index.html`
- **Dependências a Instalar:**
  - `vite-plugin-pwa`
- **Checklist de Execução Detalhado:**
  - [x] Configurar `VitePWA` com `registerType: 'autoUpdate'`, suporte a offline precaching para todos os assets JS, CSS e fontes
  - [x] Declarar `manifest.json` corporativo com `name: "SGMS — GEPF Agroindústria"`, `short_name: "SGMS"`, `theme_color: "#0f172a"`, `display: "standalone"`
  - [x] Configurar meta tags para compatibilidade iOS/Safari (`apple-mobile-web-app-capable`)
- **Critérios de Aceite e Verificação Obrigatória:**
  - [x] **Caminho Normal:** Navegador exibe prompt nativo "Adicionar à tela inicial" no smartphone/tablet.
  - [x] **Funcionamento Offline:** Com o servidor web temporariamente suspenso, a casca da aplicação continua abrindo via cache do Service Worker.

---

### ✅ Tarefa 3.2: Camada de Armazenamento Offline IndexedDB (`idb`)
- **Objetivo:** Implementar o repositório local estruturado no navegador para armazenar os eventos de produção e paradas antes do envio de rede.
- **Arquivos a Modificar / Criar:**
  - `frontend/src/lib/offline-storage.ts`
  - `frontend/src/types/offline.ts`
- **Contratos e Tipagens Envolvidas:**
  ```typescript
  export interface OfflineEvent {
    clientUuid: string;
    type: 'PRODUCTION' | 'DOWNTIME';
    endpoint: string;
    payload: Record<string, unknown>;
    createdAt: string;
    status: 'PENDING' | 'SYNCED';
  }
  ```
- **Checklist de Execução Detalhado:**
  - [x] Inicializar o banco IndexedDB `sgms_offline_db` (versão 1) com a object store `pending_events` usando `clientUuid` como keyPath
  - [x] Criar índice por `status` para busca rápida de eventos pendentes
  - [x] Implementar métodos: `saveEvent(event)`, `getPendingEvents()`, `markAsSynced(uuids: string[])`, `clearSyncedEvents()`
- **Critérios de Aceite e Verificação Obrigatória:**
  - [x] **Caminho Normal:** Apontamentos gerados localmente são gravados com status `PENDING`.
  - [x] **Zero Fallback:** Proibido uso de `localStorage` com strings mágicas serializadas sem chave primária para dados transacionais.

---

### ✅ Tarefa 3.3: Hook de Sincronização Automática (`useOfflineSync`)
- **Objetivo:** Monitorar o status de conectividade do dispositivo e despachar a fila acumulada no IndexedDB para o backend (`POST /api/sync`) assim que a rede local for restabelecida.
- **Arquivos a Modificar / Criar:**
  - `frontend/src/hooks/use-offline-sync.ts`
  - `frontend/src/components/sync/sync-badge.tsx`
  - `frontend/src/services/sync-service.ts`
- **Checklist de Execução Detalhado:**
  - [x] Registrar listeners de eventos `window.addEventListener('online')` e `window.addEventListener('offline')`
  - [x] Disparar rotina de sincronização:
    1. Ler eventos com status `PENDING` do IndexedDB
    2. Se houver pendências, enviar payload `{ events }` para `POST /api/sync`
    3. Recebendo HTTP 200 com a lista de `clientUuids` processados, marcar ou remover do IndexedDB
    4. Atualizar badge visual com toast discreto: "X apontamentos sincronizados com sucesso"
  - [x] Tratar falhas de rede sem remover os dados locais, reagendando nova tentativa
- **Critérios de Aceite e Verificação Obrigatória:**
  - [x] **Caminho Normal:** Ao reconectar à rede, o hook esvazia a fila local com sucesso.
  - [x] **Resiliência:** Quedas súbitas durante o envio mantêm os registros locais intactos para o próximo ciclo.

---

### ✅ Tarefa 3.4: Console Operacional do Chão de Fábrica (`OperatorConsolePage`)
- **Objetivo:** Construir o painel de comando do operador para a sopradora em operação, destacando o status da máquina, contadores do turno e botões táteis primários.
- **Arquivos a Modificar / Criar:**
  - `frontend/src/pages/operator/operator-console-page.tsx`
  - `frontend/src/components/operator/operator-header.tsx`
  - `frontend/src/components/operator/production-summary-card.tsx`
- **Checklist de Execução Detalhado:**
  - [x] Barra superior com código da máquina (`SOPRO-01`), nome do operador logado, turno ativo e o `SyncBadge`
  - [x] Card de Status da Máquina em destaque visual:
    - Se `RUNNING`: fundo verde sutil com texto "EM OPERAÇÃO"
    - Se `STOPPED`: fundo vermelho pulsante com cronômetro de parada ativo
  - [x] Card com totalizador acumulado de garrafas sopradas no turno corrente
  - [x] Botão de Ação Primária touch: "+ Apontar Produção" (classe `h-14 text-lg w-full touch-manipulation`)
  - [x] Botão de Parada:
    - Se operando: botão vermelho "Parar Máquina" (abre modal de parada)
    - Se parada ativa: botão verde "Retomar Produção" (resolve a parada imediatamente)
  - [x] Link secundário: "Registrar Parada Retroativa"
- **Critérios de Aceite e Verificação Obrigatória:**
  - [x] **Caminho Normal:** Operador visualiza os dados em tempo real da máquina alocada.
  - [x] **Ergonomia:** Alvos de clique de grande dimensão facilitam toque com luvas industriais ou dedos úmidos.

---

### ✅ Tarefa 3.5: Gaveta Touch de Apontamento de Garrafas (`ProductionDrawer`)
- **Objetivo:** Permitir o registro rápido da contagem de garrafas sopradas via gaveta touch inferior (`Sheet`), com foco automático no teclado numérico nativo do celular.
- **Arquivos a Modificar / Criar:**
  - `frontend/src/components/production/production-drawer.tsx`
  - `frontend/src/schemas/production-schema.ts`
  - `frontend/src/components/ui/sheet.tsx`
- **Contratos e Tipagens Envolvidas:**
  ```typescript
  export const productionSchema = z.object({
    quantity: z.number().int().positive('A quantidade deve ser maior que zero.'),
    recordedAt: z.string(),
  });
  export type ProductionFormData = z.infer<typeof productionSchema>;
  ```
- **Checklist de Execução Detalhado:**
  - [x] Utilizar o componente `Sheet` do shadcn configurado com `side="bottom"` para telas menores (`sm`)
  - [x] Input com classes `text-3xl text-center font-bold h-16` e atributo `inputMode="numeric"`
  - [x] Timestamp inicializado com a hora corrente (`new Date().toISOString()`), permitindo edição pontual
  - [x] Ao confirmar:
    1. Gera `clientUuid = crypto.randomUUID()`
    2. Grava evento no IndexedDB (`OfflineStorage.saveEvent`)
    3. Tenta envio HTTP imediato via Axios
    4. Se sucesso, atualiza contador na tela; se falha de rede, avisa "Salvo no dispositivo"
    5. Fecha a gaveta e reseta o formulário
- **Critérios de Aceite e Verificação Obrigatória:**
  - [x] **Caminho Normal:** Envio em 2 toques: abre gaveta, digita número e toca em "Confirmar".
  - [x] **Violação de Contrato:** Quantidade zero ou vazia rejeitada síncronamente pelo Zod.

---

### ✅ Tarefa 3.6: Modal de Paradas em Tempo Real e Retroativas (`DowntimeModal`)
- **Objetivo:** Construir o componente para apontamento de interrupções de linha, tratando os motivos padronizados e exigindo justificativa obrigatória para `OUTROS`.
- **Arquivos a Modificar / Criar:**
  - `frontend/src/components/downtime/downtime-modal.tsx`
  - `frontend/src/schemas/downtime-schema.ts`
- **Contratos e Tipagens Envolvidas:**
  ```typescript
  export const downtimeSchema = z.object({
    reason: z.enum(['PRE_FORMA', 'COMPRESSOR', 'AQUECIMENTO_FORNO', 'MOLDE', 'MECANICA', 'ELETRICA', 'OUTROS']),
    justification: z.string().optional(),
    startTime: z.string(),
    endTime: z.string().optional(),
    isRetroactive: z.boolean(),
  }).refine((data) => {
    if (data.reason === 'OUTROS') {
      return !!data.justification && data.justification.trim().length >= 5;
    }
    return true;
  }, {
    message: 'Justificativa obrigatória (mínimo de 5 caracteres) para o motivo OUTROS.',
    path: ['justification'],
  });
  ```
- **Checklist de Execução Detalhado:**
  - [x] Seletor visual de motivos em botões de rádio ou grade de cards (Pré-forma, Compressor, Molde, Forno, Mecânica, Elétrica, Outros)
  - [x] Se o operador selecionar "Outros", renderizar campo `Textarea` obrigatório com foco imediato
  - [x] Modo Tempo Real: captura carimbo atual e envia para `POST /api/downtimes/start`
  - [x] Modo Retroativo: inputs de data/hora de Início e Término, validando $T_{fim} \ge T_{ini}$ antes do envio
  - [x] Gravação Local-First com `clientUuid` no IndexedDB antes do disparo de rede
- **Critérios de Aceite e Verificação Obrigatória:**
  - [x] **Caminho Normal:** Registro de parada altera o console para modo paralisado e inicia cronômetro visual.
  - [x] **Violação de Contrato:** Seleção de "Outros" sem preenchimento de justificativa impede o envio e destaca o campo com erro.

---

### ⏳ Tarefa 3.7: Auditoria Zero Fallback, Simulação Offline & Build
- **Objetivo:** Validar a conformidade de ponta a ponta no cliente, garantindo integridade de dados e compilação de produção.
- **Arquivos a Inspecionar:**
  - `frontend/src/**/*`
- **Checklist de Execução Detalhado:**
  - [ ] Inspecionar componentes garantindo que campos opcionais propaguem `null` e não strings vazias
  - [ ] Teste em modo avião (DevTools Network: Offline):
    - Realizar 3 apontamentos de garrafas e 1 parada
    - Verificar gravação no IndexedDB
    - Restabelecer conexão (Network: Online)
    - Validar disparo do lote para `/api/sync` e limpeza da fila
  - [ ] Executar `npm run build` e validar geração dos bundles sem erros de tipo
- **Critérios de Aceite e Verificação Obrigatória:**
  - [ ] Compilação de produção verde gerando bundles PWA na pasta `dist/`.
  - [ ] Zero perda de dados na simulação de queda de rede local.

---

## 5. Auditoria de Zero Fallback e Integridade de Dados

- [ ] Campo `justification` transmitido estritamente como `null` quando o motivo for diferente de `OUTROS`.
- [ ] Indicador de sincronização exibe a contagem real de pendências e nunca omite dados não confirmados pelo servidor.
- [ ] Prevenção de duplicidade por reenvio garantida pelo identificador único imutável `clientUuid`.
- [ ] Proibido o uso de `any` no payload de sincronização do IndexedDB.

---

## 6. Homologação Final da Fase e Critérios de Encerramento

- [ ] PWA instalado na tela inicial de smartphone Android e iPad/tablet.
- [ ] Apontamento de garrafas concluído em menos de 5 segundos via gaveta touch.
- [ ] Simulação de corte de rede local: dados permanecem no IndexedDB e sincronizam automaticamente ao reconectar.
- [ ] Build estrito de produção executado com sucesso (`npm run build`).
