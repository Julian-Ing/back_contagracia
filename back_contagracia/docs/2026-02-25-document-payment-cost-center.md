# DocumentPayment — cost_center_id FK

**Fecha:** 2026-02-25

---

## Resumen

Se agrega `cost_center_id` (nullable, FK) al modelo `DocumentPayment` en `schema-tenant.prisma`, permitiendo asociar cada línea de pago de un documento con un centro de costos.

## Schema

```prisma
model DocumentPayment {
  // ... campos existentes ...
  cost_center_id String?
  cost_center    CostCenter? @relation(fields: [cost_center_id], references: [id])
  @@index([cost_center_id])
}

model CostCenter {
  // ... campos existentes ...
  document_payments DocumentPayment[]
}
```

## Archivos modificados

| Acción     | Archivo                                                      |
| ---------- | ------------------------------------------------------------ |
| Modificado | `contagracia-shared-modules/prisma/schema-tenant.prisma`     |

## Migración

Ejecutado con `migrate-all-tenants.ts` (usa `db push` internamente para tenants).
