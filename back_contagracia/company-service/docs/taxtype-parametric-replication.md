# Replicación de TaxType en Paramétricos del Tenant

## Descripción

Se agregó la tabla `tax_types` al método `replicateParametrics` del `TenantService` para que los nuevos tenants reciban los tipos de impuesto desde la base de datos master.

## Archivo Modificado

### TenantService (`company-service/src/modules/tenant/tenant.service.ts`)
- Se añadió `taxType` a la consulta de datos paramétricos desde master
- Se añadió el upsert de `TaxType` en la transacción de replicación al tenant
- Campos replicados: `id`, `code`, `name`, `description`, `is_tax`, `is_active`

## Tablas Paramétricas Replicadas

1. Departments
2. Municipalities
3. TypeDocumentIdentification
4. TypeOrganization
5. TypeRegime
6. TypeLiability
7. Bank
8. PaymentMethod
9. ProductUnit
10. **TaxType** *(nueva)*
11. TaxRate
