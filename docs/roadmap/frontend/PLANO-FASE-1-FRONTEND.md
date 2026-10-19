# SGMS — Planejamento Detalhado: Fase 1 (Frontend)

> **Documento:** Plano de Execução Técnica & Checklist Sequencial da Fase 1 (Setup Vite, Design System shadcn/ui, Autenticação & Gestão de Contas)  
> **Status:** 🟡 Planejada / Pronta para Execução Atômica (0 de 7 Tarefas Concluídas)  
> **Módulo:** Frontend (React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui + React Hook Form + Zod + Axios + Sonner)  
> **Data de Criação:** 2026-10-19  
> **Fonte da Verdade:** [01-requisitos.md](file:///home/ferreito/SGMS/docs/01-requisitos.md) | [02-regras-de-negocio.md](file:///home/ferreito/SGMS/docs/02-regras-de-negocio.md) | [05-arquitetura.md](file:///home/ferreito/SGMS/docs/05-arquitetura.md) | [ROADMAP-FRONTEND.md](file:///home/ferreito/SGMS/docs/roadmap/frontend/ROADMAP-FRONTEND.md)  

---

## 1. Visão Geral e Princípios Operacionais da Entrega

1. **Design Corporativo Clean & Acessível:** Interface moderna com contraste equilibrado, tipografia profissional (Inter/Roboto), feedback visual claro em toasts (`sonner`) e alvos de interação generosos ($\ge 44\text{px}$).
2. **Reuso Estrito de Primitivos shadcn/ui:** Proibida a criação de botões, inputs ou modais artesanais com HTML cru. Todos os componentes devem ser importados de `@/components/ui`.
3. **Consumo de Erros RFC 7807 (Zero Fallback):** O cliente HTTP intercepta erros formatados em `application/problem+json` e apresenta diretamente o `detail` ou mensagens pontuais do array `errors`, sem inventar textos genéricos ou mensagens mágicas.
4. **Isolamento de Papéis na Interface:** Rotas administrativas (`/admin/*`) bloqueadas para perfil `OPERADOR`. Sessões inválidas ou expiradas redirecionadas instantaneamente para `/login`.

---

## 2. Matriz de Cobertura de Telas / Componentes / Contratos

| Rota / Tela | Componente Alvo | Perfil Permitido | Comportamento Operacional / Regra |
| :--- | :--- | :---: | :--- |
| `/login` | `frontend/src/pages/login-page.tsx` | Público | Formulário de login corporativo, validação Zod, desabilitação no envio e redirecionamento |
| `/admin/users` | `frontend/src/pages/users-page.tsx` | `GERENTE` | Listagem tabular de operadores, toggle de status e modal para cadastro de novo operador |
| `ProtectedRoute` | `frontend/src/components/auth/protected-route.tsx` | Autenticado | Intercepta rota e valida permissão por perfil (`requiredRole`) |
| `UserCreateDialog`| `frontend/src/components/users/user-create-dialog.tsx`| `GERENTE` | Modal com formulário Zod para criação de operador e atualização instantânea da tabela |
| `apiClient` | `frontend/src/lib/api-client.ts` | Global | Instância Axios com interceptors de JWT e extração de erros RFC 7807 |

---

## 3. Status Geral da Fase

```
Progresso da Fase 1 (Frontend): [--------------------------------] 0% Concluído (0 de 7 tarefas)
```

| ID | Tarefa | Status | Módulo / Artefatos |
| :---: | :--- | :---: | :--- |
| **1.1** | Inicialização do Projeto Vite, TypeScript & Tailwind CSS | ⏳ Pendente | `frontend/package.json`, `frontend/vite.config.ts` |
| **1.2** | Instalação e Configuração dos Componentes shadcn/ui | ⏳ Pendente | `frontend/src/components/ui/*`, `frontend/src/lib/utils.ts` |
| **1.3** | Cliente HTTP Axios e Mapeamento de Erros RFC 7807 | ⏳ Pendente | `frontend/src/lib/api-client.ts` |
| **1.4** | Gerenciamento de Sessão (`AuthContext`, `useAuth`, `ProtectedRoute`) | ⏳ Pendente | `frontend/src/contexts/auth-context.tsx` |
| **1.5** | Tela de Login Corporativa (`LoginPage`) | ⏳ Pendente | `frontend/src/pages/login-page.tsx` |
| **1.6** | Tela de Gestão de Contas de Operadores (`UsersPage`) | ⏳ Pendente | `frontend/src/pages/users-page.tsx` |
| **1.7** | Auditoria Zero Fallback, Responsividade & Build de Produção | ⏳ Pendente | Testes visuais, tipos e `npm run build` |

---

## 4. Detalhamento Técnico das Tarefas

---

### ⏳ Tarefa 1.1: Inicialização do Projeto Vite, TypeScript & Tailwind CSS
- **Objetivo:** Criar a estrutura base da aplicação web SPA na pasta `frontend/`, configurando Tailwind CSS, aliases de importação `@/*` e variáveis de ambiente locais.
- **Arquivos a Modificar / Criar:**
  - `frontend/package.json`
  - `frontend/vite.config.ts`
  - `frontend/tsconfig.json`
  - `frontend/tailwind.config.js`
  - `frontend/src/index.css`
- **Dependências a Instalar:**
  - `react`, `react-dom`, `react-router-dom`
  - `tailwindcss`, `postcss`, `autoprefixer`, `clsx`, `tailwind-merge`
- **Checklist de Execução Detalhado:**
  - [ ] Inicializar projeto Vite com template `react-ts`
  - [ ] Configurar alias `@` apontando para `src/` no `vite.config.ts` e `tsconfig.json`
  - [ ] Configurar tokens de cores corporativas (tons sóbrios de azul petróleo/ardósia, cinzas neutros e acentos de status) no `tailwind.config.js`
  - [ ] Importar fontes limpas no `index.css` e declarar reset com foco em touch
- **Critérios de Aceite e Verificação Obrigatória:**
  - [ ] **Caminho Normal:** `npm run dev` inicia o servidor na porta 5173 com estilos Tailwind ativos.
  - [ ] **Compilabilidade:** `npm run build` executa sem erros de tipos.

---

### ⏳ Tarefa 1.2: Instalação e Configuração dos Componentes shadcn/ui
- **Objetivo:** Integrar os componentes oficiais da biblioteca shadcn/ui necessários para a Fase 1, garantindo consistência visual e acessibilidade Radix UI.
- **Arquivos a Modificar / Criar:**
  - `frontend/src/lib/utils.ts` (helper `cn`)
  - `frontend/src/components/ui/button.tsx`
  - `frontend/src/components/ui/input.tsx`
  - `frontend/src/components/ui/card.tsx`
  - `frontend/src/components/ui/dialog.tsx`
  - `frontend/src/components/ui/table.tsx`
  - `frontend/src/components/ui/badge.tsx`
  - `frontend/src/components/ui/sonner.tsx`
- **Dependências a Instalar:**
  - `@radix-ui/react-dialog`, `@radix-ui/react-slot`, `lucide-react`, `sonner`
- **Checklist de Execução Detalhado:**
  - [ ] Criar o utilitário `cn(...inputs)` com `clsx` e `twMerge` em `src/lib/utils.ts`
  - [ ] Implementar os componentes de botão, input, card, modal dialog, tabela e badge
  - [ ] Configurar o componente `Toaster` do Sonner no layout raiz (`App.tsx`)
  - [ ] Garantir que o componente `Button` possua altura mínima `h-11` na variante primária para alvos touch
- **Critérios de Aceite e Verificação Obrigatória:**
  - [ ] **Caminho Normal:** Componentes renderizam com estilos aplicados e interatividade acessível (fechamento com ESC, foco visível).

---

### ⏳ Tarefa 1.3: Cliente HTTP Axios e Mapeamento de Erros RFC 7807
- **Objetivo:** Estabelecer uma instância centralizada do Axios para comunicação na rede local com envio automático do cabeçalho de autorização e tratamento transparente de erros RFC 7807.
- **Arquivos a Modificar / Criar:**
  - `frontend/src/lib/api-client.ts`
  - `frontend/src/types/api.ts`
- **Contratos e Tipagens Envolvidas:**
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
  - [ ] Criar instância `apiClient` com `baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api'`
  - [ ] Configurar Request Interceptor que adiciona `Authorization: Bearer <token>` a partir do storage
  - [ ] Configurar Response Interceptor que extrai o corpo RFC 7807 em caso de erro HTTP e rejeita a Promise com o objeto `ProblemDetails` tipado
  - [ ] Redirecionar para `/login` caso o erro seja HTTP 401
- **Critérios de Aceite e Verificação Obrigatória:**
  - [ ] **Caminho Normal:** Requisições autenticadas trafegam com o token no cabeçalho.
  - [ ] **Zero Fallback:** Em caso de erro, a mensagem exibida na UI deve ser estritamente o `detail` recebido da API, sem substituição por "Ocorreu um erro inesperado".

---

### ⏳ Tarefa 1.4: Gerenciamento de Sessão (`AuthContext`, `useAuth`, `ProtectedRoute`)
- **Objetivo:** Criar o estado global de autenticação no React, provendo métodos de login, logout e guards de rota baseados nos papéis `GERENTE` e `OPERADOR`.
- **Arquivos a Modificar / Criar:**
  - `frontend/src/contexts/auth-context.tsx`
  - `frontend/src/hooks/use-auth.ts`
  - `frontend/src/components/auth/protected-route.tsx`
  - `frontend/src/routes/app-routes.tsx`
- **Contratos e Tipagens Envolvidas:**
  ```typescript
  export interface AuthenticatedUser {
    id: string;
    name: string;
    username: string;
    role: 'GERENTE' | 'OPERADOR';
  }

  export interface AuthContextType {
    user: AuthenticatedUser | null;
    token: string | null;
    isLoading: boolean;
    login: (token: string, user: AuthenticatedUser) => void;
    logout: () => void;
  }
  ```
- **Checklist de Execução Detalhado:**
  - [ ] Implementar `AuthProvider` inicializando estado a partir do `localStorage` local seguro
  - [ ] Criar hook customizado `useAuth()` garantindo contexto não nulo
  - [ ] Implementar `ProtectedRoute` que avalia: (1) se está autenticado; (2) se o `user.role` coincide com `requiredRole`
  - [ ] Se o papel for insuficiente, redirecionar com aviso amigável sem quebrar a renderização
- **Critérios de Aceite e Verificação Obrigatória:**
  - [ ] **Caminho Normal:** Usuário logado navega pelas rotas permitidas de acordo com seu perfil.
  - [ ] **Violação de Contrato:** Tentativa de acesso a `/admin/*` por um `OPERADOR` resulta em bloqueio e redirecionamento.

---

### ⏳ Tarefa 1.5: Tela de Login Corporativa (`LoginPage`)
- **Objetivo:** Construir uma página de login com design corporativo sóbrio, campos com labels acessíveis, integração com `react-hook-form` + `zod`, desabilitação de botão durante a requisição e feedback visual via toast.
- **Arquivos a Modificar / Criar:**
  - `frontend/src/pages/login-page.tsx`
  - `frontend/src/schemas/auth-schema.ts`
- **Contratos e Tipagens Envolvidas:**
  ```typescript
  export const loginSchema = z.object({
    username: z.string().trim().min(1, 'Informe o nome de usuário ou login.'),
    password: z.string().min(1, 'Informe a senha de acesso.'),
  });
  export type LoginFormData = z.infer<typeof loginSchema>;
  ```
- **Checklist de Execução Detalhado:**
  - [ ] Criar layout centralizado em card corporativo com logo/título do SGMS (GEPF Agroindústria)
  - [ ] Formulário com `react-hook-form` integrado ao resolver Zod
  - [ ] Botão de envio com feedback de carregamento (`isSubmitting`) prevenindo duplo clique
  - [ ] Disparo de toast de erro `toast.error(error.detail)` em caso de falha de credenciais
  - [ ] Redirecionamento condicional pós-login: `GERENTE` $\rightarrow$ `/admin/users`; `OPERADOR` $\rightarrow$ `/chao-de-fabrica`
- **Critérios de Aceite e Verificação Obrigatória:**
  - [ ] **Caminho Normal:** Login com credenciais válidas autentica com sucesso e redireciona.
  - [ ] **Violação de Contrato:** Submissão com campos vazios exibe mensagens de validação síncronas sem disparar requisição.

---

### ⏳ Tarefa 1.6: Tela de Gestão de Contas de Operadores (`UsersPage`)
- **Objetivo:** Permitir ao Gerente de Produção cadastrar novos operadores de máquina e gerenciar o status de ativação/inativação das contas através de uma tabela responsiva com modal dialog.
- **Arquivos a Modificar / Criar:**
  - `frontend/src/pages/users-page.tsx`
  - `frontend/src/components/users/user-create-dialog.tsx`
  - `frontend/src/components/layout/app-layout.tsx`
  - `frontend/src/schemas/user-schema.ts`
- **Contratos e Tipagens Envolvidas:**
  ```typescript
  export const createOperatorSchema = z.object({
    name: z.string().trim().min(3, 'Nome deve ter no mínimo 3 caracteres.'),
    username: z.string().trim().min(3, 'Login deve ter no mínimo 3 caracteres.'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres.'),
  });
  ```
- **Checklist de Execução Detalhado:**
  - [ ] Criar `AppLayout` com barra superior corporativa exibindo nome do Gerente e botão "Sair"
  - [ ] Tabela shadcn (`Table`) listando: Nome, Login, Perfil (`Badge`), Status (`Ativo`/`Inativo`) e Ações
  - [ ] Botão primário "+ Novo Operador" que abre o `UserCreateDialog`
  - [ ] Modal com validação Zod e envio para `POST /api/users`
  - [ ] Ação de alternar status (toggle ativo/inativo) via chamada `PATCH /api/users/:id/status` com atualização otimista ou refetch imediato
  - [ ] Feedback tátil via `toast.success` e `toast.error`
- **Critérios de Aceite e Verificação Obrigatória:**
  - [ ] **Caminho Normal:** Novo operador cadastrado aparece imediatamente na lista sem recarregar a página.
  - [ ] **Violação de Contrato:** Tentativa de criar operador com login duplicado exibe o erro 409 vindo do backend em toast de alerta.

---

### ⏳ Tarefa 1.7: Auditoria Zero Fallback, Responsividade & Build de Produção
- **Objetivo:** Auditar todo o código do frontend quanto à conformidade de tipos, ausência de valores mágicos, ergonomia touch nos 4 breakpoints e compilação limpa para produção.
- **Arquivos a Inspecionar:**
  - `frontend/src/**/*`
- **Checklist de Execução Detalhado:**
  - [ ] Inspecionar código e remover qualquer ocorrência de `|| ""` ou `|| 0` em renderização condicional
  - [ ] Testar layout em resolução mobile (360px), tablet (768px) e desktop (1280px)
  - [ ] Verificar que os alvos de clique em botões e inputs satisfazem $\ge 44\text{px}$
  - [ ] Executar `npm run build` e validar saída sem warnings de bundle ou erros de TypeScript
- **Critérios de Aceite e Verificação Obrigatória:**
  - [ ] Compilação de produção verde gerando artefatos estáticos na pasta `frontend/dist/`.
  - [ ] Zero erros no console do navegador durante o fluxo de login e navegação.

---

## 5. Auditoria de Zero Fallback e Integridade de Dados

- [ ] Ausência de dados opcionais renderizada honestamente (ex: traço `-` explícito ou `null`, nunca textos fictícios ou vazios mágicos).
- [ ] Erros de validação da API extraídos diretamente do `ProblemDetails` e destacados visualmente nos campos correspondentes.
- [ ] Proibido o uso de `any` ou type-casting não seguro (`as unknown as X`).
- [ ] Formulários desabilitam o botão de envio durante o processamento (`formState.isSubmitting`) para blindar contra duplicidades.

---

## 6. Homologação Final da Fase e Critérios de Encerramento

- [ ] Tela de Login operando conectada à API local na porta 3001.
- [ ] Gerente autentica, acessa a tela de usuários e cadastra um operador.
- [ ] Operador autentica e é barrado ao tentar acessar rotas `/admin/*`.
- [ ] Build estrito de produção executado com sucesso (`npm run build`).
