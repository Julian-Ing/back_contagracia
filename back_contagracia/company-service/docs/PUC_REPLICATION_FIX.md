# Fix: Replicacion PUC por Niveles

## Problema

Al registrar una empresa, la replicacion de cuentas PUC al tenant fallaba con:

```
Foreign key constraint violated
```

Esto ocurria porque las cuentas con `parent_code` se insertaban en paralelo con sus padres, violando la FK.

## Solucion

Se modifico `tenant.service.ts` para insertar las cuentas PUC por niveles (largo del codigo):

1. **Nivel 1** (1 digito): 1, 2, 3, 4, 5, 6, 7, 8, 9
2. **Nivel 2** (2 digitos): 11, 13, 14, 15, 22, etc.
3. **Nivel 4** (4 digitos): 1105, 1110, 1520, etc.
4. **Nivel 6** (6 digitos): 110505, 152005, etc.
5. **Nivel 8** (8 digitos): 11050501, etc.

Asi los padres siempre existen antes de insertar los hijos.

## Codigo

```typescript
// Chart of Accounts (PUC base) - insertar por niveles para respetar FK
const accountsByLevel = chartOfAccounts.reduce((acc, coa) => {
  const level = coa.code.length;
  if (!acc[level]) acc[level] = [];
  acc[level].push(coa);
  return acc;
}, {} as Record<number, typeof chartOfAccounts>);

const levels = Object.keys(accountsByLevel).map(Number).sort((a, b) => a - b);
for (const level of levels) {
  await Promise.all(
    accountsByLevel[level].map((coa) =>
      tenantPrisma.chartOfAccount.upsert({
        where: { code: coa.code },
        create: { ... },
        update: {},
      }),
    ),
  );
}
```

## Archivo

```
company-service/src/modules/tenant/tenant.service.ts
```
