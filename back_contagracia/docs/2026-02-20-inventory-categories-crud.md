# Inventario — CRUD Categorías

**Fecha:** 2026-02-20

## Resumen
Implementación del módulo de inventario con CRUD completo de categorías de productos en `inventory-service`.

## Cambios en Schema (schema-tenant.prisma)
- Modelo `ProductCategory`: id, tenant_id, consecutive, name, description, is_aiu, created_at, updated_at
- Modelo `Product`: id, tenant_id, category_id (FK → ProductCategory), consecutive, name, description, etc.
- Relación: ProductCategory → Product[] (1:N)

## Backend — inventory-service/src/modules/categories/
- **categories.controller.ts**: GET (paginado + fuzzy search), POST, PATCH, DELETE. Sin `@RequirePermissions` (permisos son frontend-only).
- **categories.service.ts**:
  - `findAll()`: Fuzzy search con `word_similarity` (pg_trgm) + `ILIKE` sobre name y consecutive. Incluye `_count.products`.
  - `create()`: Usa `getNextConsecutive(tx, 'product_category')` dentro de `$transaction`.
  - `update()`: Bloquea edición de categorías AIU (`is_aiu = true`).
  - `delete()`: Bloquea eliminación si tiene productos asociados o si es AIU.
- **DTOs**: `CreateCategoryDto` (name requerido, description opcional), `UpdateCategoryDto` (ambos opcionales).

## Shared Modules — getNextConsecutive
- Movido de `accounting-service/src/functions/` a `contagracia-shared-modules/src/functions/get-next-consecutive.ts`
- Compilación in-place (patrón shared-dian): `src/tsconfig.json` sin outDir → genera .js al lado del .ts
- Exportado en `index.ts` y `index.js` de shared-modules
- 9 archivos en accounting-service actualizados para importar desde `@contagracia/shared-modules`

## Fuzzy Search — Índices GIN
Agregados en `migrate-all-tenants.ts` → `setupFuzzySearch()`:
```sql
CREATE INDEX IF NOT EXISTS idx_pc_name_trgm ON "product_categories" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_pc_consecutive_trgm ON "product_categories" USING gin ("consecutive" gin_trgm_ops);
```

## Workspace
- Habilitados: `inventory-service`, `tax-service`
- Deshabilitados: `admin-service`, `electronic-documents-service`

## Archivos Nuevos
- `contagracia-shared-modules/src/functions/get-next-consecutive.ts` (+ .js, .d.ts compilados)
- `contagracia-shared-modules/src/tsconfig.json`
- `inventory-service/src/modules/categories/` (controller, service, module, dto/)

## Archivos Modificados
- `contagracia-shared-modules/index.ts` — export getNextConsecutive
- `contagracia-shared-modules/index.js` — require getNextConsecutive
- `contagracia-shared-modules/prisma/schema-tenant.prisma` — modelos inventario
- `contagracia-shared-modules/prisma/scripts/migrate-all-tenants.ts` — índices GIN
- `inventory-service/src/app.module.ts` — CategoriesModule
- `inventory-service/package.json` — dependencias (class-validator, class-transformer, @nestjs/swagger)
- `accounting-service/src/functions/index.ts` — re-export desde shared-modules
- 9 archivos en accounting-service — import desde @contagracia/shared-modules
- `pnpm-workspace.yaml`, `package.json` — workspace config
