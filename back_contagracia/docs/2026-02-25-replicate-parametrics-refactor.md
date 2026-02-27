# Refactor: replicateParametrics delega a seed-all-tenants

**Fecha:** 2026-02-25

## Problema

`tenant.service.ts` tenía su propia implementación de `replicateParametrics` que duplicaba parcialmente la lógica de `seed-all-tenants.ts`, pero le faltaban catálogos como `costCenterMovementTypes`, `costCenterMovementReferenceTypes`, `bankMovementTypes`, `expenseCategories`, `bankAccounts`, entre otros. Al registrar una empresa nueva, la tenant quedaba incompleta.

## Solución

- `replicateParametrics()` ahora ejecuta `seed-all-tenants.ts --force --company-id=<id>` como proceso hijo, reutilizando la misma lógica completa sin duplicar código.
- Se agregó el flag `--company-id=<uuid>` a `seed-all-tenants.ts` para filtrar por una empresa específica.
- Se eliminaron los imports de seeds que ya no se usan directamente en `tenant.service.ts`.

## Archivos modificados

- `company-service/src/modules/tenant/tenant.service.ts` — reemplazó ~700 líneas de replicación manual por llamada al script
- `contagracia-shared-modules/prisma/scripts/seed-all-tenants.ts` — agregó flag `--company-id`
