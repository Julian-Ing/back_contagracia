# Replicación de CompanyPaymentMethod a Tenant

## Fecha: 2026-01-31

## Resumen
CompanyPaymentMethod se seedea en master y se replica a cada tenant igual que los otros catálogos paramétricos.

## Flujo

1. **Master:** Los defaults se seedean desde `seed.ts` -> `companyPaymentMethods.ts`
2. **Tenant:** Se replican desde master en `tenant.service.ts` método `replicateParametrics()`

## Datos por defecto

| id | payment_method_code | name | description |
|----|---------------------|------|-------------|
| 1 | 42 | Transferencia Bancaria | Consignación o transferencia bancaria |
| 2 | 10 | Efectivo | Pago en efectivo |
| 3 | 20 | Cheque | Pago con cheque |
| 4 | 48 | Tarjeta Crédito | Pago con tarjeta de crédito |
| 5 | 49 | Tarjeta Débito | Pago con tarjeta débito |

## Archivos
- `contagracia-shared-modules/prisma/schema-master.prisma` - Modelo en master
- `contagracia-shared-modules/prisma/seeds/companyPaymentMethods.ts` - Datos y función seed
- `contagracia-shared-modules/prisma/seeds/seed.ts` - Orquestador
- `company-service/src/modules/tenant/tenant.service.ts` - Replicación a tenant
