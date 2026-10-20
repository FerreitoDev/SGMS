# SGMS — Planejamento Detalhado: Fase 1 (Backend)

> **Documento:** Plano de Execução Técnica & Checklist Sequencial da Fase 1 (Fundação, Prisma, Autenticação JWT & Gestão de Usuários)  
> **Status:** 🟢 Concluída (7 de 7 Tarefas Concluídas)  
> **Módulo:** Backend (NestJS 10 + TypeScript Estrito + Prisma ORM + PostgreSQL 16 + JWT/Passport)  
> **Data de Criação:** 2026-10-19  
> **Fonte da Verdade:** [01-requisitos.md](file:///home/ferreito/SGMS/docs/01-requisitos.md) | [02-regras-de-negocio.md](file:///home/ferreito/SGMS/docs/02-regras-de-negocio.md) | [04-modelo-de-dados.md](file:///home/ferreito/SGMS/docs/04-modelo-de-dados.md) | [05-arquitetura.md](file:///home/ferreito/SGMS/docs/05-arquitetura.md) | [ROADMAP-BACKEND.md](file:///home/ferreito/SGMS/docs/roadmap/backend/ROADMAP-BACKEND.md)  

---

## 1. Visão Geral e Princípios Operacionais da Entrega

1. **Autenticação Desacoplada e Segura (RBAC):** Login com hash criptográfico (Bcrypt), emissão de tokens JWT assinados com segredo local e bloqueio rigoroso de rotas via `RolesGuard`.
2. **Integridade de Dados e Erros RFC 7807:** Toda exceção lançada na API é interceptada pelo `HttpExceptionFilter` e formatada no padrão RFC 7807 (`application/problem+json`).
3. **Zero Fallback e Validação nas Fronteiras:** Requisições são validadas de forma estrita via DTOs com `class-validator`. Dados ausentes legítimos propagam como `null`; ausências ilegítimas geram HTTP 400 imediato sem valores substitutos (`|| ""`, `|| 0`).
4. **Isolamento de Papéis:** Operadores só acessam autenticação e leitura de perfil; o gerenciamento de contas de operadores (`POST /api/users`) é restrito exclusivamente ao perfil `GERENTE`.

---

## 2. Matriz de Cobertura de Entidades / Rotas / Contratos

| Rota / Elemento | Arquivo Alvo | Perfil Permitido | Comportamento Operacional / Regra |
| :--- | :--- | :---: | :--- |
| `POST /api/auth/login` | `backend/src/modules/auth/auth.controller.ts` | Público | Valida credenciais e retorna JWT assinado com perfil e ID do usuário |
| `GET /api/auth/me` | `backend/src/modules/auth/auth.controller.ts` | Autenticado | Retorna dados cadastrais do usuário corrente via `@CurrentUser()` |
| `POST /api/users` | `backend/src/modules/users/users.controller.ts` | `GERENTE` | Cadastra nova conta de operador com validação de unicidade de login |
| `GET /api/users` | `backend/src/modules/users/users.controller.ts` | `GERENTE` | Lista operadores cadastrados (com filtro de status ativo/inativo) |
| `PATCH /api/users/:id/status` | `backend/src/modules/users/users.controller.ts` | `GERENTE` | Altera status (`isActive: true/false`) sem deletar histórico operacional |
| `HttpExceptionFilter` | `backend/src/common/filters/http-exception.filter.ts` | Global | Formata todas as falhas no padrão canônico RFC 7807 |

---

## 3. Status Geral da Fase

```
Progresso da Fase 1 (Backend): [================================] 100% Concluído (7 de 7 tarefas)
```

| ID | Tarefa | Status | Módulo / Artefatos |
| :---: | :--- | :---: | :--- |
| **1.1** | Inicialização do Projeto NestJS 10 & Dependências Base | ✅ Concluída | `backend/package.json`, `backend/tsconfig.json` |
| **1.2** | Prisma ORM, Model User, Migrations & Seed de Gerente | ✅ Concluída | `backend/prisma/schema.prisma`, `backend/prisma/seed.ts` |
| **1.3** | Filtro Global de Exceção RFC 7807 (Problem Details) | ✅ Concluída | `backend/src/common/filters/http-exception.filter.ts` |
| **1.4** | Módulo de Autenticação (`AuthModule`) e Emissão de JWT | ✅ Concluída | `backend/src/modules/auth/*` |
| **1.5** | Guards e Decorators de Segurança (`JwtAuthGuard`, `@Roles()`) | ✅ Concluída | `backend/src/common/guards/*`, `backend/src/common/decorators/*` |
| **1.6** | Módulo de Gestão de Usuários (`UsersModule` para Gerente) | ✅ Concluída | `backend/src/modules/users/*` |
| **1.7** | Auditoria Zero Fallback, Testes de Integração & Homologação | ✅ Concluída | `backend/test/auth.e2e-spec.ts`, `backend/test/users.e2e-spec.ts` |

---

## 4. Detalhamento Técnico das Tarefas

---

### ✅ Tarefa 1.1: Inicialização do Projeto NestJS 10 & Dependências Base
- **Objetivo:** Criar a estrutura base do projeto NestJS na pasta `backend/` com TypeScript estrito, scripts de compilação e dependências necessárias para autenticação e banco.
- **Arquivos a Modificar / Criar:**
  - `backend/package.json`
  - `backend/tsconfig.json`
  - `backend/src/main.ts`
  - `backend/src/app.module.ts`
- **Dependências a Instalar:**
  - `@nestjs/common`, `@nestjs/core`, `@nestjs/config`, `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`
  - `bcryptjs`, `@types/bcryptjs`
  - `class-validator`, `class-transformer`
  - `@prisma/client`, `prisma` (devDependencies)
- **Checklist de Execução Detalhado:**
  - [x] Inicializar projeto NestJS com configuração de porta via `process.env.PORT || 3001`
  - [x] Habilitar CORS para permitir requisições da LAN e prefixo global `/api`
  - [x] Habilitar `ValidationPipe` global com `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`
- **Critérios de Aceite e Verificação Obrigatória:**
  - [x] **Caminho Normal:** `npm run start:dev` inicia o servidor na porta 3001 e responde no endpoint raiz.
  - [x] **Compilabilidade:** `npm run build` executa sem erros de TypeScript.

---

### ✅ Tarefa 1.2: Prisma ORM, Model User, Migrations & Seed de Gerente
- **Objetivo:** Estabelecer a camada de persistência com PostgreSQL local, definindo o model `User`, o enum `UserRole`, rodando a migration inicial e criando o usuário Gerente padrão via seed.
- **Arquivos a Modificar / Criar:**
  - `backend/prisma/schema.prisma`
  - `backend/prisma/seed.ts`
  - `backend/src/database/prisma.service.ts`
  - `backend/src/database/prisma.module.ts`
- **Contratos e Tipagens Envolvidas:**
  ```prisma
  enum UserRole {
    GERENTE
    OPERADOR
  }

  model User {
    id           String   @id @default(uuid()) @db.Uuid
    name         String   @db.VarChar(120)
    username     String   @unique @db.VarChar(50)
    passwordHash String   @db.VarChar(255)
    role         UserRole
    isActive     Boolean  @default(true)
    createdAt    DateTime @default(now()) @db.Timestamptz
    updatedAt    DateTime @updatedAt @db.Timestamptz

    @@map("users")
  }
  ```
- **Checklist de Execução Detalhado:**
  - [x] Inicializar o Prisma e configurar a variável `DATABASE_URL` no `.env`
  - [x] Configurar `PrismaService` estendendo `PrismaClient` com `onModuleInit` e `enableShutdownHooks`
  - [x] Executar `npx prisma migrate dev --name init_users`
  - [x] Criar script `seed.ts` que insere o Gerente `admin` com senha criptografada caso não exista
- **Critérios de Aceite e Verificação Obrigatória:**
  - [x] **Caminho Normal:** `npx prisma db seed` executa com sucesso e grava o usuário `admin` no banco.
  - [x] **Violação de Contrato:** Tentativa de inserir usuário com `username` duplicado falha com erro de constraint unique.

---

### ✅ Tarefa 1.3: Filtro Global de Exceção RFC 7807 (Problem Details)
- **Objetivo:** Padronizar todas as respostas de erro da aplicação segundo o formato canônico RFC 7807, eliminando vazamento de stacktraces e assegurando comunicação limpa com o frontend.
- **Arquivos a Modificar / Criar:**
  - `backend/src/common/filters/http-exception.filter.ts`
  - `backend/src/main.ts` (registro global do filtro)
- **Contrato de Resposta RFC 7807:**
  ```typescript
  export interface ProblemDetails {
    type: string;
    title: string;
    status: number;
    detail: string;
    instance: string;
    code?: string;
    timestamp: string;
    errors?: Record<string, string[]>;
  }
  ```
- **Checklist de Execução Detalhado:**
  - [x] Criar classe `HttpExceptionFilter` implementando `ExceptionFilter` do NestJS
  - [x] Mapear status HTTP correspondente (`BadRequestException` $\rightarrow$ 400, `UnauthorizedException` $\rightarrow$ 401, `ForbiddenException` $\rightarrow$ 403, `NotFoundException` $\rightarrow$ 404, `ConflictException` $\rightarrow$ 409, `UnprocessableEntityException` $\rightarrow$ 422)
  - [x] Tratar mensagens de validação do `class-validator` estruturando o objeto `errors`
  - [x] Definir header `Content-Type: application/problem+json` na resposta
- **Critérios de Aceite e Verificação Obrigatória:**
  - [x] **Caminho Normal:** Erros lançados retornam JSON com `status`, `title`, `detail`, `instance` e `timestamp`.
  - [x] **Zero Fallback:** Proibido retornar `{ statusCode: 500, message: "Internal server error" }` para erros de domínio conhecidos.

---

### ✅ Tarefa 1.4: Módulo de Autenticação (`AuthModule`) e Emissão de JWT
- **Objetivo:** Implementar o fluxo de autenticação com validação segura de credenciais, comparação de hash com `bcryptjs` e emissão de tokens JWT com expiração de 12 horas.
- **Arquivos a Modificar / Criar:**
  - `backend/src/modules/auth/dto/login.dto.ts`
  - `backend/src/modules/auth/auth.service.ts`
  - `backend/src/modules/auth/auth.controller.ts`
  - `backend/src/modules/auth/auth.module.ts`
- **Contratos e Tipagens Envolvidas:**
  ```typescript
  export class LoginDto {
    @IsNotEmpty({ message: 'O login é obrigatório.' })
    @IsString()
    username: string;

    @IsNotEmpty({ message: 'A senha é obrigatória.' })
    @IsString()
    password: string;
  }

  export interface AuthTokenResponse {
    accessToken: string;
    user: {
      id: string;
      name: string;
      username: string;
      role: UserRole;
    };
  }
  ```
- **Checklist de Execução Detalhado:**
  - [x] Implementar `validateUser(username, password)` no `AuthService`
  - [x] Implementar `login(loginDto)` gerando payload `{ sub: user.id, username: user.username, role: user.role }`
  - [x] Endpoint `POST /api/auth/login` retornando token e dados do usuário
  - [x] Rejeitar login se o usuário estiver inativo (`isActive: false`) com HTTP 403
- **Critérios de Aceite e Verificação Obrigatória:**
  - [x] **Caminho Normal:** Credenciais válidas retornam HTTP 200 com `accessToken` válido.
  - [x] **Violação de Contrato:** Senha incorreta ou usuário inexistente retorna HTTP 401 Unauthorized em RFC 7807.

---

### ✅ Tarefa 1.5: Guards e Decorators de Segurança (`JwtAuthGuard`, `@Roles()`)
- **Objetivo:** Estabelecer a infraestrutura de proteção de rotas com Passport JWT, extração do usuário autenticado e verificação do papel (`Role`) do colaborador.
- **Arquivos a Modificar / Criar:**
  - `backend/src/modules/auth/strategies/jwt.strategy.ts`
  - `backend/src/common/guards/jwt-auth.guard.ts`
  - `backend/src/common/guards/roles.guard.ts`
  - `backend/src/common/decorators/roles.decorator.ts`
  - `backend/src/common/decorators/current-user.decorator.ts`
  - `backend/src/modules/auth/auth.controller.ts` (endpoint `GET /api/auth/me`)
- **Checklist de Execução Detalhado:**
  - [x] Configurar `JwtStrategy` extraindo token do cabeçalho `Authorization: Bearer <token>`
  - [x] Implementar decorator `@Roles(...roles: UserRole[])` usando `SetMetadata`
  - [x] Implementar `RolesGuard` verificando se `user.role` coincide com os papéis anotados
  - [x] Implementar decorator `@CurrentUser()` para injeção limpa nos controllers
  - [x] Endpoint `GET /api/auth/me` protegido por `JwtAuthGuard` retornando os dados do usuário autenticado
- **Critérios de Aceite e Verificação Obrigatória:**
  - [x] **Caminho Normal:** Requisição com JWT válido acessa `GET /api/auth/me` com sucesso.
  - [x] **Violação de Contrato:** Requisição sem token retorna HTTP 401; requisição com papel insuficiente retorna HTTP 403.

---

### ✅ Tarefa 1.6: Módulo de Gestão de Usuários (`UsersModule` para Gerente)
- **Objetivo:** Permitir ao Gerente de Produção cadastrar novos operadores, listar colaboradores ativos e desativar contas sem exclusão física do histórico de dados.
- **Arquivos a Modificar / Criar:**
  - `backend/src/modules/users/dto/create-operator.dto.ts`
  - `backend/src/modules/users/dto/update-user-status.dto.ts`
  - `backend/src/modules/users/users.service.ts`
  - `backend/src/modules/users/users.controller.ts`
  - `backend/src/modules/users/users.module.ts`
- **Contratos e Tipagens Envolvidas:**
  ```typescript
  export class CreateOperatorDto {
    @IsNotEmpty({ message: 'Nome é obrigatório.' })
    @IsString()
    name: string;

    @IsNotEmpty({ message: 'Login é obrigatório.' })
    @IsString()
    username: string;

    @IsNotEmpty({ message: 'Senha é obrigatória.' })
    @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres.' })
    password: string;
  }

  export class UpdateUserStatusDto {
    @IsBoolean({ message: 'Status ativo deve ser booleano.' })
    isActive: boolean;
  }
  ```
- **Checklist de Execução Detalhado:**
  - [x] Configurar rotas protegidas com `@UseGuards(JwtAuthGuard, RolesGuard)` e `@Roles(UserRole.GERENTE)`
  - [x] `POST /api/users`: criptografa a senha com Bcrypt e grava com papel `UserRole.OPERADOR`
  - [x] `GET /api/users`: lista operadores cadastrados ordenados por nome (ocultando `passwordHash`)
  - [x] `PATCH /api/users/:id/status`: atualiza campo `isActive` do operador
  - [x] Rejeição com HTTP 409 Conflict se `username` já existir
- **Critérios de Aceite e Verificação Obrigatória:**
  - [x] **Caminho Normal:** Gerente cadastra operador e recebe HTTP 201 com ID e sem hash de senha.
  - [x] **Violação de Contrato:** Operador tentando acessar `POST /api/users` recebe HTTP 403 Forbidden.

---

### ✅ Tarefa 1.7: Auditoria Zero Fallback, Testes de Integração & Homologação
- **Objetivo:** Executar testes automatizados ponta a ponta dos fluxos de autenticação, validação de DTOs e controle de acesso RBAC, garantindo conformidade rigorosa com a Diretriz Global.
- **Arquivos a Modificar / Criar:**
  - `backend/test/auth.e2e-spec.ts`
  - `backend/test/users.e2e-spec.ts`
- **Checklist de Execução Detalhado:**
  - [x] Teste E2E de login com credenciais corretas $\rightarrow$ 200 OK com JWT
  - [x] Teste E2E de login com senha incorreta $\rightarrow$ 401 Unauthorized em RFC 7807
  - [x] Teste E2E de tentativa de login de usuário inativo $\rightarrow$ 403 Forbidden
  - [x] Teste E2E de criação de operador por Gerente $\rightarrow$ 201 Created
  - [x] Teste E2E de criação de operador por Operador $\rightarrow$ 403 Forbidden
  - [x] Auditoria de código garantindo zero `|| ""` ou `|| 0` em DTOs e Services
  - [x] Validação do build estrito: `npm run build` executado com saída verde
- **Critérios de Aceite e Verificação Obrigatória:**
  - [x] Suíte de testes automatizados executando 100% verde (32 testes unitários e E2E).
  - [x] Zero erros de compilação TypeScript em modo estrito.

---

## 5. Auditoria de Zero Fallback e Integridade de Dados

- [x] Proibido o uso de `|| 0`, `|| ""`, `|| "N/A"`, `?? []` silencioso nos services e DTOs.
- [x] Ausência de campo obrigatório rejeitada imediatamente na fronteira HTTP pelo `ValidationPipe`.
- [x] Senhas nunca expostas em retornos de consultas (`passwordHash` expressamente excluído dos selects).
- [x] Erros preservam contexto de diagnóstico no formato RFC 7807 com causa e detalhamento da violação.

---

## 6. Homologação Final da Fase e Critérios de Encerramento

- [x] PostgreSQL local inicializado com migrações aplicadas.
- [x] Usuário Gerente `admin` criado via seed e autenticando com sucesso.
- [x] Endpoints `/api/auth/*` e `/api/users/*` testados e validados contra violações.
- [x] Compilação de produção (`npm run build`) verde e sem advertências.
