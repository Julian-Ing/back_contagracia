# Productos — CRUD Backend

**Fecha:** 2026-02-20

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /products | Lista con fuzzy search, filtros, paginación |
| GET | /products/:id | Detalle con relaciones completas |
| POST | /products | Crear producto (mode=PRODUCT) |
| PATCH | /products/:id | Actualizar parcial |
| DELETE | /products/:id | Soft delete (solo sin movimientos) |
| POST | /products/:id/combinations | Crear combinaciones para un producto |

## Campos Requeridos (Crear)

- name, sku (unique), category_id, unit_id, tax_id, price, cost
- tax_included, costing_type (LAST_PURCHASE/AVERAGE), is_service
- asset_account_code, cogs_account_code, revenue_account_code — requeridas si la empresa tiene módulo `accounting`

## Validaciones

### Crear Producto
- SKU único global
- Nombre único entre productos principales activos
- FKs validadas (categoría, unidad, impuesto existen)
- Cuentas contables validadas contra chart_of_accounts (si tiene módulo contabilidad)
- Todo en una transacción

### Crear Combinaciones
- Padre debe ser mode=PRODUCT y is_service=false
- Opciones de atributo deben existir y estar activas
- No 2 opciones del mismo atributo por combinación
- No set duplicado de opciones por producto padre (fingerprint)
- No duplicados entre sí en la misma solicitud
- SKU único global
- Combinaciones siempre is_service=false
- Heredan del padre: category, unit, tax, tax_included, costing_type, cuentas contables
- Todo en una sola transacción (rollback completo si algo falla)

### Eliminar Producto
- Solo si no tiene movimientos registrados
- Desactiva combinaciones hijas automáticamente
- En transacción

## Vista Jerárquica (GET /products)

El endpoint GET /products soporta `view_mode` para controlar cómo se retornan productos y combinaciones:

| view_mode | Comportamiento |
|-----------|---------------|
| `all` (default) | Productos padre con combinaciones anidadas. Si búsqueda coincide con combinación, trae al padre. Si coincide con padre, trae sus combinaciones. |
| `products` | Solo productos principales (mode=PRODUCT), flat. |
| `combinations` | Solo combinaciones (mode=COMBINATION) con `parent_product` anidado, flat. |

**Parámetros adicionales:**
- `is_service` (boolean) — Filtra por tipo (producto/servicio)
- `search` — Fuzzy search por nombre, SKU, código
- `page`, `limit` — Paginación

## Top Selling (2026-02-21)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /products/top-selling | Productos más vendidos |

**Query Params:** `limit` (default 10), `from` (YYYY-MM-DD), `to` (YYYY-MM-DD), `storage_id` (uuid)

Agrega movimientos de tipo venta (direction=OUT, type_key='sale') desde `product_movements`.
Retorna: id, consecutive, sku, name, price, is_service, total_quantity, total_movements.

## Archivos Creados
- `src/modules/products/products.module.ts`
- `src/modules/products/products.controller.ts`
- `src/modules/products/products.service.ts`
- `src/modules/products/dto/create-product.dto.ts`
- `src/modules/products/dto/update-product.dto.ts`
- `src/modules/products/dto/create-combinations.dto.ts`
- `src/modules/products/dto/index.ts`

## Archivos Modificados
- `src/app.module.ts` — Registrado ProductsModule
- `src/modules/units/units.service.ts` — Corregido getTenantPrisma → getTenantClient
- `src/modules/units/units.controller.ts` — Agregado company_id desde req.user
