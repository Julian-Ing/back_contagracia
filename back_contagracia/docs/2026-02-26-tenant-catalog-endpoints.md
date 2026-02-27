# Catálogos en company-service (tenant DB)

**Fecha**: 2026-02-26

## Resumen

Endpoints de catálogos paramétricos que leen directamente del tenant DB en vez de master. Minimiza llamadas a master durante sesiones de tenant.

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/catalogs` | Lista catálogos disponibles |
| GET | `/catalogs/:table` | Lista registros con búsqueda y paginación |
| GET | `/catalogs/:table/:id` | Obtener registro por ID |
| GET | `/catalogs/departments/by-country/:countryId` | Departamentos por país |
| GET | `/catalogs/municipalities/by-department/:departmentId` | Municipios por departamento |

### Query params (GET /:table)

- `active` (boolean) — filtrar por is_active
- `search` (string) — búsqueda por nombre (case insensitive)
- `page` (number, default 1)
- `limit` (number, default 50)

### Tablas disponibles

departments, municipalities, type-document-identifications, type-organizations, type-regimes, type-liabilities, banks, payment-methods, product-units, tax-types, taxes

### Autenticación

Todos los endpoints requieren JWT. El `company_id` se obtiene de `req.user.company_id`.

## Archivos nuevos (company-service)

- `src/modules/catalogs/catalogs.controller.ts`
- `src/modules/catalogs/catalogs.service.ts`
- `src/modules/catalogs/catalogs.module.ts`

## Archivos modificados

- `src/app.module.ts` — import CatalogsModule

## Frontend

- `shared/services/catalogs.service.ts` — usa `companyClient` + `/catalogs/` en vez de `adminClient` + `/admin/catalogs/`
- Countries sigue en admin-service (no replicado a tenant)
- CatalogName ahora usa hyphens (`type-document-identifications` en vez de `type_document_identifications`)
