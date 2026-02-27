# Endpoint GET /taxes/for-select

**Fecha:** 2026-02-21

## Descripción
Endpoint ligero para poblar selects de impuestos. Solo devuelve `{id, name, rate, tax_type_id}` sin joins a cuentas contables.

## Query params
- `search` — buscar por nombre o código
- `is_tax` — `true` para impuestos, `false` para retenciones
- `include_type_ids` — IDs de tipo a incluir (separados por coma, ej: `1,2`)
- `exclude_type_ids` — IDs de tipo a excluir (separados por coma, ej: `5,6`)

## Archivos modificados
- `src/modules/taxes/taxes.controller.ts`
- `src/modules/taxes/taxes.service.ts`
