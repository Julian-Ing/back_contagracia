# Consecutivos separados para CXC y CXP

**Fecha:** 2026-02-13

## Problema

Existía un solo tipo de consecutivo `ar_ap` con prefijo `CXC` para ambos tipos de ArAp (RECEIVABLE y PAYABLE). Esto causaba que las Cuentas por Pagar tuvieran consecutivos como "CXC-0001" en vez de "CXP-0001".

## Solución

### 1. Seeds de consecutivos (`contagracia-shared-modules/prisma/seeds/consecutiveTypes.ts`)

Se reemplazó el tipo único:
```typescript
// ANTES:
{ type: 'ar_ap', default_prefix: 'CXC', description: 'Cuenta por Cobrar/Pagar', ... }

// DESPUES:
{ type: 'ar_ap_receivable', default_prefix: 'CXC', description: 'Cuenta por Cobrar', table_name: 'ArAp', condition_field: 'type', condition_value: 'RECEIVABLE' },
{ type: 'ar_ap_payable', default_prefix: 'CXP', description: 'Cuenta por Pagar', table_name: 'ArAp', condition_field: 'type', condition_value: 'PAYABLE' },
```

### 2. Función create-ar-ap (`accounting-service/src/functions/create-ar-ap.ts`)

Se selecciona el tipo de consecutivo según el tipo de ArAp:
```typescript
const consecutiveType = params.type === 'RECEIVABLE' ? 'ar_ap_receivable' : 'ar_ap_payable';
const consecutive = await getNextConsecutive(tx, consecutiveType);
```

## Post-cambio

Después de estos cambios se debe ejecutar:
```bash
cd contagracia-shared-modules
npx prisma generate --schema=prisma/schema-tenant.prisma
npx ts-node prisma/seeds/seed.ts           # actualiza master
npx ts-node prisma/scripts/seed-all-tenants.ts --force  # sincroniza tenants
```

Los registros ArAp existentes conservan sus consecutivos antiguos (CXC-XXXX para CxP). Solo los nuevos registros obtienen el prefijo correcto.
