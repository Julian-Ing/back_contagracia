# Refactor de Nombres — Inventario (Variantes → Combinaciones/Opciones)

**Fecha:** 2026-02-20

## Problema
Mezcla de terminología inconsistente en el sistema de inventario:
- `ProductVariance` = valor de atributo (S, M, L) — "varianza" no tiene sentido semántico
- `ProductMode.VARIANT` = modo de producto combinación — "variante" confuso
- Permisos `inventory.variants.*` — decía "variantes" pero eran opciones de atributo
- UI decía "Atributos y Términos" — "términos" no describe nada

## Terminología Unificada

| Concepto | Antes | Después |
|----------|-------|---------|
| Atributo (Talla, Color) | `ProductAttribute` | `ProductAttribute` (sin cambio) |
| Opción de atributo (S, M, L) | `ProductVariance` | `ProductAttributeOption` |
| Junction combinación-opción | `ProductVarianceAssignment` | `ProductCombinationAttribute` |
| Modo de producto | `VARIANT` | `COMBINATION` |
| Relación padre→hijos | `variants` | `combinations` |
| Relación producto→opciones | `variance_assignments` | `combination_attributes` |
| Relación atributo→opciones | `variances` | `options` |
| Permisos | `inventory.variants.*` | `inventory.attribute_options.*` |
| Consecutivo | `product_variance` / IV | `product_attribute_option` / OPC |
| Label sidebar | "Atributos y Términos" | "Atributos y Opciones" |

## Tablas Renombradas en DB

| Antes | Después |
|-------|---------|
| `product_variances` | `product_attribute_options` |
| `product_variance_assignments` | `product_combination_attributes` |

## Archivos Modificados

### Backend (contagracia-shared-modules)
- `prisma/schema-tenant.prisma` — Modelos, enum, relaciones, @@map
- `prisma/seeds/modules/actions/inventory.ts` — 5 permisos renombrados
- `prisma/seeds/consecutiveTypes.ts` — Tipo consecutivo renombrado
- `prisma/seeds/PERMISOS_GRANULARES.md` — Documentación permisos actualizada
- `docs/inventario-sistema-completo.md` — Documentación sistema actualizada
- `docs/consecutivos-sistema.md` — Referencia consecutivo actualizada

### Frontend (front_contagracia)
- `src/config/navigation.ts` — Label "Atributos y Términos" → "Atributos y Opciones"

## Post-cambio
- `npx prisma generate --schema=prisma/schema-tenant.prisma` ✅
- `npx ts-node prisma/scripts/migrate-all-tenants.ts` ✅ (1 tenant migrado)
- `npx ts-node prisma/seeds/seed.ts` ✅ (master — 5 acciones obsoletas eliminadas, 653 re-creadas)
- `npx ts-node prisma/scripts/seed-all-tenants.ts --force` ✅ (permisos y consecutivos actualizados en tenant)
