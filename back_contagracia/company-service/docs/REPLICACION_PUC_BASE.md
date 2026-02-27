# Replicación PUC Base a Tenants

## Resumen

Se actualizó `tenant.service.ts` para replicar el Plan de Cuentas base desde Master a cada nuevo Tenant.

## Cambios en replicateParametrics()

### Nuevas consultas
```typescript
this.prisma.chartOfAccount.findMany()
```

### Lógica de inserción

Se replica en dos fases para respetar la jerarquía:

1. **Cuentas sin padre** (clases principales: 1, 2, 3...)
2. **Cuentas con padre** (subcuentas: 11, 1105, 110505...)

```typescript
// Primero cuentas raíz
...chartOfAccounts
  .filter((coa) => !coa.parent_id)
  .map((coa) => tenantPrisma.chartOfAccount.upsert({...}))

// Luego subcuentas
...chartOfAccounts
  .filter((coa) => coa.parent_id)
  .map((coa) => tenantPrisma.chartOfAccount.upsert({...}))
```

## Logs

```
[PARAMETRICS] - Plan de Cuentas Base: X
[PARAMETRICS] ✓ Tablas paramétricas replicadas exitosamente
```

## Archivo Modificado

`src/modules/tenant/tenant.service.ts`
