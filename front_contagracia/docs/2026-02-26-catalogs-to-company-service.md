# Catálogos: migración de admin-service → company-service

**Fecha**: 2026-02-26

## Resumen

`catalogs.service.ts` ahora lee catálogos paramétricos del tenant DB via company-service (`companyClient` + `/catalogs/`) en vez de admin-service (`adminClient` + `/admin/catalogs/`).

## Cambios

### `shared/services/catalogs.service.ts`

- Import: agregado `companyClient`, mantenido `adminClient` (solo para countries)
- `getAll`, `getById`, `getAvailableCatalogs` → `companyClient` + `/catalogs/`
- `getCountries` → sigue en `adminClient` (Country no está replicado a tenant)
- `getDepartmentsByCountry`, `getMunicipalitiesByDepartment` → `companyClient`
- `getAll` response: parsea `response.data.data` (paginado) con fallback a `response.data`
- `getMunicipalitiesByDepartment` → acepta `number | string` (antes solo `number`)

### CatalogName (breaking change en el type)

Ahora usa hyphens para coincidir con el backend:

| Antes | Después |
|-------|---------|
| `type_document_identifications` | `type-document-identifications` |
| `type_organizations` | `type-organizations` |
| `type_regimes` | `type-regimes` |
| `type_liabilities` | `type-liabilities` |
| `payment_methods` | `payment-methods` |
| `tax_types` | `tax-types` |
| `product_units` | `product-units` |
| `countries` | (removido — usa `getCountries()` directo) |

## Sin cambios

- `useCatalogs.ts` — no cambia, usa los métodos nombrados (`getDocumentTypes`, etc.)
- Componentes consumidores — no cambian, usan el hook
