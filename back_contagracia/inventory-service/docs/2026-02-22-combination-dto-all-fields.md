# CombinationItemDto: todos los campos del producto + endpoint fingerprints

**Fecha:** 2026-02-22

## Cambios

### CombinationItemDto (create-combinations.dto.ts)

Campos opcionales nuevos (si no se envían, se heredan del padre):

- `description?: string`
- `category_id?: string`
- `unit_id?: string`
- `tax_id?: string`
- `tax_included?: boolean`
- `costing_type?: string`
- `asset_account_code?: string`
- `cogs_account_code?: string`
- `revenue_account_code?: string`

### products.service.ts — createCombinations()

Cada campo usa `combo.field ?? parent.field` como fallback. Si el frontend envía un valor, lo usa; si no, hereda del padre.

### Nuevo endpoint: GET /products/:id/combination-fingerprints

Retorna array de fingerprints (sorted option IDs separados por coma) de las combinaciones activas del producto padre. Usado por el generador bulk para filtrar combinaciones ya existentes.

### mapCombinationItem — IDs en atributos

Se agregan `attribute_id` y `option_id` a cada atributo en la respuesta de combinaciones. Antes solo devolvía nombres.

## Frontend

### types/index.ts

- `CombinationAttribute`: agregados `attribute_id: string` y `option_id: string`
- `CreateCombinationItem`: agregados campos opcionales (description, category_id, unit_id, etc.)

### products.service.ts

- Nuevo método `getCombinationFingerprints(productId)` → `GET /products/:id/combination-fingerprints`

### ProductForm.tsx — handleSave

Al crear combinación, ahora envía `...basePayload` completo (todos los campos del form) en vez de solo name/barcode/price/cost.
