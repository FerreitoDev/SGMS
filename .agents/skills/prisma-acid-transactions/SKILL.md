---
name: prisma-acid-transactions
description: Padrões de transações ACID no Prisma ORM, controle de concorrência com lock pessimista (SELECT FOR UPDATE), cálculo de saldos e prevenção de estoque negativo.
---

# Skill: Transações ACID & Integridade de Estoque no Prisma

Esta skill orienta a implementação de operações transacionais seguras no SECOM, prevenindo condições de corrida (*race conditions*) e corrupção de saldos.

## 1. Regra Inegociável: Transações Interativas Obrigatórias
Toda mutação que altera saldo físico de estoque (`Stock`) deve ocorrer dentro de uma transação interativa gerenciada do Prisma:

```typescript
await this.prisma.$transaction(async (tx) => {
  // 1. Toda a lógica de verificação e débito ocorre aqui dentro
  // 2. Se qualquer erro for lançado, todo o bloco sofre rollback automático
});
```

## 2. Lock Pessimista na Confirmação de Retirada (`FOR UPDATE`)
Para evitar que dois operadores confirmem a retirada do mesmo saldo residual simultaneamente:
```typescript
// Executar query com lock exclusivo na linha da tabela stocks
const [stock] = await tx.$queryRaw<Array<{ id: string; quantity: string }>>`
  SELECT id, quantity FROM "stocks"
  WHERE "productId" = ${productId} AND "warehouseId" = ${warehouseId}
  FOR UPDATE
`;

if (!stock || Number(stock.quantity) < quantityRequested) {
  throw new UnprocessableEntityException('Saldo insuficiente no estoque deste galpão.');
}

// Prosseguir com o update seguro
await tx.stock.update({
  where: { id: stock.id },
  data: { quantity: { decrement: quantityRequested } },
});
```

## 3. Rastreabilidade Obrigatória (`StockMovement`)
Toda alteração de saldo exige a inserção no mesmo bloco transacional do registro correspondente em `StockMovement`:
- `type`: `INBOUND`, `OUTBOUND` ou `ADJUSTMENT`.
- `previousQuantity` e `newQuantity` gravados fielmente.
- Se o produto for perecível (`isPerishable = true`), salvar `expirationDate`.

## 4. Manipulação Correta de Tipos Decimais
- O Prisma mapeia `Decimal(12, 3)` para a classe `Prisma.Decimal`.
- Converta para cálculo numérico seguro ou utilize os métodos nativos (`.add()`, `.sub()`, `.equals()`) para evitar erros de ponto flutuante do JavaScript (`0.1 + 0.2 !== 0.3`).
