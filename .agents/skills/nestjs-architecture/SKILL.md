---
name: nestjs-architecture
description: Padrões oficiais de desenvolvimento NestJS 10+, arquitetura modular, injeção de dependência, DTOs com class-validator, guards e filtros de exceção RFC 7807.
---

# Skill: Arquitetura NestJS 10+ & Boas Práticas

Esta skill orienta a implementação de código limpo, performático e tipado no backend NestJS do SECOM.

## 1. Estrutura Modular por Domínio
Cada módulo funcional (ex: `products`, `stock`, `requests`) deve ser autocontido:
```text
modules/stock/
├── dto/
│   ├── inbound-stock.dto.ts
│   └── transfer-stock.dto.ts
├── stock.controller.ts
├── stock.service.ts
└── stock.module.ts
```
- Importe o `PrismaModule` nos módulos que precisam acessar o banco de dados.
- Não exporte serviços desnecessariamente; exponha apenas o que outros módulos consomem.

## 2. Validação Estrita com DTOs & class-validator
- Todo endpoint que recebe payload (`POST`, `PUT`, `PATCH`) deve possuir um DTO dedicado.
- Tipagem rigorosa com decoradores:
  ```typescript
  import { IsNotEmpty, IsNumber, IsPositive, IsUUID, IsOptional, IsEnum } from 'class-validator';
  import { Type } from 'class-transformer';

  export class InboundStockDto {
    @IsUUID()
    @IsNotEmpty()
    productId: string;

    @IsUUID()
    @IsNotEmpty()
    warehouseId: string;

    @IsNumber({ maxDecimalPlaces: 3 })
    @IsPositive()
    @Type(() => Number)
    quantity: number;

    @IsOptional()
    expirationDate?: string;
  }
  ```

## 3. Controle de Acesso (RBAC) & Guards
- Proteja rotas utilizando `@UseGuards(JwtAuthGuard, RolesGuard)`:
  ```typescript
  @Roles(Role.ADMIN)
  @Patch(':id')
  updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }
  ```
- Use o decorator `@CurrentUser()` para obter os dados do usuário autenticado no token.

## 4. Padronização de Exceções
- Utilize as exceções nativas do NestJS:
  - `NotFoundException` para recursos inexistentes.
  - `ConflictException` para códigos/SKUs duplicados (409).
  - `UnprocessableEntityException` ou `BadRequestException` para saldo insuficiente ou regras de negócio violadas (422/400).
