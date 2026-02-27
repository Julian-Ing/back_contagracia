# Correcciones productos — SKU→barcode + validaciones + unit default

**Fecha:** 2026-02-21

## 1. Renombrar SKU → barcode
- **Schema:** `sku String? @unique` → `barcode String @unique` (requerido)
- **DTOs:** `sku` → `barcode` en create-product, update-product, create-combinations (todos requeridos)
- **Service:** Todas las referencias, validaciones, mensajes de error y mapeos
- **Índice GIN:** `idx_prod_sku_trgm` → `idx_prod_barcode_trgm` en migrate-all-tenants.ts

## 2. Validación cuentas contables diferenciada
**Antes:** Exigía las 3 cuentas siempre con módulo contabilidad.
**Después:**
- Producto: inventario + costos + ingresos (las 3)
- Servicio: solo ingresos (inventario y costos = null)

## 3. Unidad de medida default para servicios
- Schema: `unit_id @default("70")` = Unidades (DIAN)
- DTO: `unit_id` ahora `@IsOptional()`
- Service: Valida requerido solo para productos

## Archivos modificados
- `contagracia-shared-modules/prisma/schema-tenant.prisma`
- `contagracia-shared-modules/prisma/scripts/migrate-all-tenants.ts`
- `inventory-service/src/modules/products/dto/*.ts`
- `inventory-service/src/modules/products/products.service.ts`
