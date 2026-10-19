# SGMS — Sistema de Gestão de Máquinas de Sopro
## `docs/05-arquitetura.md`

---

### 1. Topologia de Infraestrutura On-Premise (Rede Local / LAN)

O SGMS é implantado fisicamente na planta fabril da GEPF Agroindústria, sem dependência de internet pública para operação, apontamentos ou geração de relatórios:

```mermaid
graph TD
    subgraph Galpão Chão de Fábrica [Galpão Industrial - Chão de Fábrica]
        Op1["Operador 1 (Smartphone Android/PWA)"]
        Op2["Operador 2 (Tablet/PWA)"]
        AP["Access Points Wi-Fi Industriais (2.4/5GHz)"]
        Op1 -->|Wi-Fi Local| AP
        Op2 -->|Wi-Fi Local| AP
    end

    subgraph Escritório Produção [Escritório da Gerência de Produção]
        Gerente["Gerente de Produção (Desktop / Navegador)"]
        Switch["Switch Gigabit Local (Ethernet)"]
        Gerente -->|Cabo de Rede| Switch
    end

    subgraph Servidor Local On-Premise [Mini-PC / Servidor Físico Local]
        AP -->|Cabo de Rede| Switch
        Switch --> Nginx["Nginx Reverse Proxy (:80 / :443 local)"]
        
        Nginx -->|Serve SPA/PWA estática| Frontend["Frontend (React 18 + Vite + Tailwind + shadcn/ui)"]
        Nginx -->|Proxy reverso /api| Backend["Backend NestJS 10 (Node.js 20 LTS)"]
        
        Backend -->|Prisma ORM (Conexão local)| Postgres[("Banco de Dados PostgreSQL 16")]
    end
```

---

### 2. Stack Tecnológica e Decisões Arquiteturais

| Camada | Tecnologia Adotada | Justificativa Técnica & Causalidade |
| :--- | :--- | :--- |
| **Backend Framework** | **NestJS 10+ (TypeScript)** | Arquitetura modular robusta, injeção de dependência desacoplada, validação estrita via DTOs com `class-validator` e compatibilidade nativa com RFC 7807. |
| **Acesso a Dados / ORM** | **Prisma ORM** | Schema como fonte única da verdade (SSOT), suporte a migrações determinísticas, tipagem estrita de retorno e suporte a transações ACID (`$transaction`). |
| **Banco de Dados** | **PostgreSQL 16** | Confiabilidade relacional, constraints de integridade condicional (`WHERE status = 'ACTIVE'`), tipos nativos de data com fuso e alta performance em agregação. |
| **Frontend Framework** | **React 18 + Vite** | Alta velocidade de build, ecossistema maduro para SPAs e suporte simplificado ao plugin de Service Worker (PWA). |
| **UI Design System** | **Tailwind CSS + shadcn/ui** | Componentes acessíveis em Radix UI, estilização corporativa *clean*, ergonomia touch controlada com alvos $\ge 44\text{px}$ e total customização sem vendor lock-in. |
| **Persistência Offline** | **IndexedDB (via `idb`)** | Armazenamento de dados transacionais estruturados no cliente para suportar apontamentos sem perda durante oscilações de Wi-Fi ou quedas de energia. |
| **Formulários e Validação** | **react-hook-form + Zod** | Validação de schema síncrona, prevenção de duplo clique (`isSubmitting`) e mensagens de erro contextuais em tempo real. |
| **Geração de Relatórios** | **Fast-CSV + PDFKit (Backend)** | Geração leve em streaming binário no servidor sem a sobrecarga de memória de navegadores headless (ex: Puppeteer). |

---

### 3. Padrão de Resposta de Erro RFC 7807 (Problem Details)

Toda violação de regra de negócio, erro de validação ou conflito de concorrência responde obrigatoriamente no padrão RFC 7807 com `Content-Type: application/problem+json`:

```json
{
  "type": "https://sgms.gepf.local/errors/conflict",
  "title": "Conflito de Alocação de Máquina",
  "status": 409,
  "detail": "Máquina já possui alocação ativa neste turno por outro operador.",
  "instance": "/api/allocations",
  "code": "MACHINE_ALREADY_ALLOCATED",
  "timestamp": "2026-10-19T20:00:00.000Z"
}
```

- **Filtro Global de Exceção (`HttpExceptionFilter`):** Intercepta todas as exceções lançadas por controllers e services, formatando o payload canônico acima sem vazamento de stacktrace para o cliente.

---

### 4. Arquitetura de Sincronização Offline (PWA & IndexedDB)

Para satisfazer o requisito de zero perda de dados em quedas de energia sem gerar APK nativo, a arquitetura cliente opera com o padrão **Local-First Buffer**:

```
[ Ação do Operador (Apontamento / Parada) ]
                  │
                  ▼
   1. Gera UUID v4 no dispositivo (clientUuid)
   2. Valida schema local via Zod
   3. Grava no IndexedDB da tabela local 'pending_events'
                  │
       ┌──────────┴──────────┐
       ▼                     ▼
[ Rede Local OK ]      [ Rede Local Offline ]
       │                     │
4. Envia HTTP POST      4. Mantém no IndexedDB
       │                     │
5. Recebe 201 Created   5. Exibe aviso: "Salvo no dispositivo"
       │                     │
6. Marca como SYNCED    6. Hook 'useOfflineSync' dispara envio
                          assim que o evento 'online' é detectado
```

#### 4.1 Contrato da Rota de Sincronização em Lote (`POST /api/sync`)

- **Payload de Entrada:**
  ```typescript
  export class SyncBatchDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SyncEventDto)
    events: SyncEventDto[];
  }
  
  export class SyncEventDto {
    @IsUUID()
    clientUuid: string;

    @IsEnum(['PRODUCTION', 'DOWNTIME'])
    type: 'PRODUCTION' | 'DOWNTIME';

    @IsObject()
    payload: Record<string, unknown>;
  }
  ```

- **Processamento no Backend:**
  Executado em bloco transacional (`prisma.$transaction`). Registros com `clientUuid` já existente são ignorados idempotentemente; novos registros são persistidos com seus carimbos originais.

---

### 5. Arquitetura Modular do Backend NestJS

A aplicação backend é organizada em módulos autocontidos orientados a domínio:

```text
backend/src/
├── common/
│   ├── decorators/          # @CurrentUser(), @Roles()
│   ├── filters/             # HttpExceptionFilter (RFC 7807)
│   ├── guards/              # JwtAuthGuard, RolesGuard
│   └── interceptors/        # LoggingInterceptor, TransformInterceptor
├── config/                  # Variáveis de ambiente validadas
├── database/
│   ├── prisma.service.ts    # Conexão centralizada com o PostgreSQL
│   └── prisma.module.ts
└── modules/
    ├── auth/                # Login, emissão de JWT, hash de senhas
    ├── users/               # CRUD de operadores pelo Gerente
    ├── machines/            # Cadastro e status das sopradoras
    ├── shifts/              # Definição dos turnos de trabalho
    ├── allocations/         # Alocação 1:1 de operador na máquina/turno
    ├── productions/         # Apontamentos de garrafas sopradas
    ├── downtimes/           # Paradas em tempo real e retroativas
    ├── sync/                # Endpoint idempotente de sincronização offline
    └── reports/             # Extração analítica em CSV e PDF
```

---

### 6. Segurança e Controle de Acesso (RBAC)

1. **Tokens JWT Assinados Localmente:**
   - Chave simétrica configurada via `JWT_SECRET` no arquivo `.env` do servidor local.
   - Expiração padrão de 12 horas (cobrindo a jornada completa de um turno fabril sem forçar re-login durante a operação).
2. **Matriz de Permissões por Perfil:**

| Rota / Recurso | `OPERADOR` | `GERENTE` |
| :--- | :---: | :---: |
| `POST /api/auth/login` | Permitido | Permitido |
| `GET /api/machines`, `GET /api/shifts` | Leitura | Leitura / Escrita |
| `POST /api/users` (Gestão de Contas) | Bloqueado (403) | Permitido |
| `POST /api/allocations` (Assumir Máquina) | Permitido | Permitido |
| `POST /api/productions`, `POST /api/downtimes` | Permitido | Permitido |
| `POST /api/allocations/:id/close` | Própria Alocação | Qualquer Alocação |
| `GET /api/reports/csv`, `GET /api/reports/pdf` | Bloqueado (403) | Permitido |
