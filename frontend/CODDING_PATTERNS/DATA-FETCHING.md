# 📡 Data Fetching & HTTP Patterns

## 🎯 Objetivo
Padronizar a comunicação com APIs no frontend, garantindo tipagem forte, cache eficiente e separação de responsabilidades.

Este projeto utiliza **TanStack Query v5** com **Axios** para gerenciamento de estado assíncrono.

---

## 🏗️ O Padrão "Quadruple-Layer"

Para cada recurso da API, devemos implementar 4 camadas distintas no arquivo de serviço:

1.  **Interfaces**: Contratos de Input (Params) e Output (Response).
2.  **HTTP Fetcher**: Função pura e assíncrona que realiza a chamada Axios.
3.  **Query Options**: Factory function que retorna a configuração do TanStack Query.
4. **Consumo**: Use no componente React. 

---

## 📝 Exemplo Prático: Módulo de Contatos

Este padrão centraliza todas as chamadas `HTTP` em um objeto e as configurações de `Query` em outro, facilitando o reuso e a manutenção.

### 1. `api/contacts.service.ts` (Funções Brutas)
```typescript
import { api } from "@/api/axios-instance";

// Objeto que centraliza TODAS as chamadas HTTP do módulo
export const contactsService = {
  list: async (params: GetContactsQuery) => {
    const { data } = await api.get<BasePaginationData<Contact>>("/contacts", { params });
    return data;
  },
  
  getById: async (id: string) => {
    const { data } = await api.get<Contact>(`/contacts/${id}`);
    return data;
  },
  
  create: async (payload: CreateContactDto) => {
    const { data } = await api.post<Contact>("/contacts", payload);
    return data;
  }
};
```

### 2. `api/contacts.queries.ts` (Consumidores TanStack)
```typescript
import { queryOptions } from "@tanstack/react-query";
import { contactsService } from "./contacts.service";

// Objeto que centraliza as opções de cache e busca
export const contactQueries = {
  all: () => ["contacts"] as const,
  lists: () => [...contactQueries.all(), "list"] as const,
  list: (params: GetContactsQuery) => queryOptions({
    queryKey: [...contactQueries.lists(), params],
    queryFn: () => contactsService.list(params),
    staleTime: 0, 
  }),
  
  details: () => [...contactQueries.all(), "detail"] as const,
  detail: (id: string) => queryOptions({
    queryKey: [...contactQueries.details(), id],
    queryFn: () => contactsService.getById(id),
    staleTime: 0, 
  })
};
```

### 3. Consumo no Componente
```tsx
import { useQuery } from "@tanstack/react-query";
import { contactQueries } from "../api/contacts.queries";

export function ContactsPage() {
  const { data } = useQuery(contactQueries.list({ limit: 10, offset: 0 }));
  // ...
}
```

---

## ⚠️ Regras de Ouro
1.  **Separação**: Nunca chame `api.get` diretamente dentro do componente.
2.  **Query Keys**: Sempre inclua os parâmetros variáveis na `queryKey`.
3.  **Tipagem**: Sempre tipe o retorno do `api.get<Type>`.
4.  **Mutations**: Para `POST/PUT/DELETE`, use o hook `useMutation`.
5.  **Sem Fallback Falso**: NUNCA mascare a ausência de um campo com valor inventado (`|| 0`, `|| "N/A"`, `?? []` silencioso), nem em hooks/seletores nem no componente. Propague `null`/`undefined` e mostre o estado real na UI.

---

## 📄 Padronização de Listagem (Paginação)

Toda requisição de listagem no sistema deve seguir os contratos globais de paginação para garantir consistência entre os módulos.

### 1. Request (Query Params)
Utilize ou estenda a interface `BaseGetPaginatedQuery`. Ela funciona como uma "base class" para parâmetros de busca comuns:

```typescript
export interface BaseGetPaginatedQuery {
  offset?: number;    // Início da busca (0-based)
  limit: number;      // Quantidade de itens por página
  searchTerm?: string; // Busca textual global
  // Outros filtros específicos do domínio...
}
```

### 2. Response (Data Wrapper)
Toda API de listagem retorna os dados envoltos na interface `BasePaginationData<T>`. Isso fornece à UI os metadados necessários para renderizar controles de paginação:

```typescript
export interface BasePaginationData<T> {
  data: T[];              // Lista de itens do tipo T
  total: number;          // Total de itens no banco (sem filtros de paginação)
  results: number;        // Total de itens retornados nesta página
  page: number;           // Página atual (calculada ou informada)
  totalPages: number;     // Total de páginas disponíveis
  pageSize: number;       // Tamanho da página solicitado
  currentPosition: number; // Offset atual
}
```

// O Exemplo acima já contempla o uso das interfaces de paginação.
