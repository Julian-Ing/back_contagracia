# Fix: Rollback en registro de empresa + orden de seeds

**Fecha:** 2026-02-25

## Problema 1 — FK violation en seeds

Al registrar una empresa nueva, `seed-all-tenants.ts` insertaba Tax Types/Taxes ANTES de Chart of Accounts (PUC). Como Tax tiene FKs a ChartOfAccount (vía `tax_sales_account_code`, etc.), esto causaba constraint violation.

### Solución

Mover el bloque de Chart of Accounts + Accounting Configs ANTES de Tax Types en `seedTenantCatalogs()`.

## Problema 2 — Registro no transaccional

Si cualquier paso del provisioning fallaba (crear DB, migrar, replicar paramétricos, crear usuario owner), la Company y Subscription ya habían sido creadas en master y quedaban huérfanas.

### Solución

Agregar rollback en el catch del provisioning:
1. Eliminar Subscription y Company de master
2. Dropear la DB del tenant si fue creada
3. Lanzar error descriptivo al usuario

## Archivos modificados

- `contagracia-shared-modules/prisma/scripts/seed-all-tenants.ts` — reordenar seeds (PUC antes de Taxes)
- `company-service/src/modules/companies/companies.service.ts` — rollback completo en catch del provisioning
- `contagracia-shared-modules/prisma/seeds/integrations.ts` — configurar SMTP Gmail para desarrollo
