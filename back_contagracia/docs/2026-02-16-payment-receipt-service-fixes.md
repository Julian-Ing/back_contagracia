# Fixes en payment-receipts.service.ts (GET detail)

## Cambios

### 1. Modelo correcto para cuentas contables

**Antes:** `tenantDb.account.findUnique({ where: { code } })`
**Despues:** `tenantDb.chartOfAccount.findUnique({ where: { code } })`

El modelo `account` no existia. El modelo correcto para buscar cuentas del PUC es `chartOfAccount`.

### 2. Campo source_description → relacion source

**Antes:** `select: { consecutive, source_description, source_number, balance }`
**Despues:** `select: { consecutive, source_number, balance, source: { select: { description: true } } }`

El campo `source_description` no existe directo en ArAp. La descripcion viene de la relacion `source` (ArApSource).

**Label generado:** `[consecutive || source_number] | [source.description]`

## Archivo

| Archivo | Cambio |
|---------|--------|
| `accounting-service/src/modules/payment-receipts/payment-receipts.service.ts` | Fix modelo account → chartOfAccount, fix source_description → source.description |
