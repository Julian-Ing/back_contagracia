# Componentes TaxSelect y CategorySelect dedicados

**Fecha:** 2026-02-21

## 1. TaxSelect — select de impuestos con filtros por tipo

### Backend: `GET /taxes/for-select`
- Endpoint ligero: solo devuelve `{id, name, rate, tax_type_id}`
- Sin joins a cuentas contables (más rápido que `GET /taxes`)
- Filtros server-side: `search`, `is_tax`, `include_type_ids`, `exclude_type_ids`

### Frontend: `TaxSelect` component
- Fetch directo al endpoint optimizado (no usa AsyncSearchableSelect)
- Props: `includeTypeIds`, `excludeTypeIds`, `isTax`, `value`, `valueLabel`, `onChange`
- Debounce 250ms en búsqueda
- Soporte portal para uso dentro de dialogs

## 2. CategorySelect — select de categorías con crear inline

### Backend: `GET /categories/for-select`
- Endpoint ligero: solo devuelve `{id, name}`
- Sin conteo de productos ni paginación (carga todas las activas)
- Filtro `search` por nombre o consecutivo

### Frontend: `CategorySelect` component
- Fetch directo al endpoint optimizado
- Crear categoría inline: input + botón aparece solo si `can('inventory.categories.create')`
- Auto-selecciona la categoría recién creada
- Debounce 250ms en búsqueda

## 3. ProductForm actualizado
- Reemplazado `AsyncSearchableSelect` por `TaxSelect` y `CategorySelect`
- Eliminados loaders `loadTaxes` y `loadCategories`
- Eliminados imports de `taxesService` y `categoriesService` en ProductForm

## Archivos modificados

### Backend
- `tax-service/src/modules/taxes/taxes.controller.ts` — endpoint `for-select`
- `tax-service/src/modules/taxes/taxes.service.ts` — método `findForSelect`
- `inventory-service/src/modules/categories/categories.controller.ts` — endpoint `for-select`
- `inventory-service/src/modules/categories/categories.service.ts` — método `findForSelect`

### Frontend
- `src/shared/components/ui/tax-select.tsx` — nuevo componente
- `src/shared/components/ui/category-select.tsx` — nuevo componente
- `src/modules/taxes/services/taxes.service.ts` — método `getForSelect`
- `src/modules/inventory/services/categories.service.ts` — método `getForSelect`
- `src/modules/inventory/components/ProductForm.tsx` — usa TaxSelect y CategorySelect
