# Fix: Prisma Query en Impersonate

## Fecha: 2026-02-02

## Problema

Error al hacer impersonate de una compañía:

```
PrismaClientValidationError: Please either use `include` or `select`, but not both at the same time.
```

## Causa

En `companies.service.ts`, la query de `impersonate()` usaba `select` e `include` simultáneamente en la relación `plan`:

```typescript
// INCORRECTO
plan: {
  select: { id: true, name: true },
  include: { plan_modules: {...} },
}
```

## Solución

Usar solo `include`:

```typescript
// CORRECTO
plan: {
  include: {
    plan_modules: {
      include: { module: true },
    },
  },
}
```

## Archivos Modificados

- `src/modules/companies/companies.service.ts` (líneas ~437-444)
