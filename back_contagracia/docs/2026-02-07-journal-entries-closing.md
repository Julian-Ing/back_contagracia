# Asientos de Cierre Contable - 2026-02-07

## Resumen

Cambios para soportar asientos de cierre contable sin fecha y mejorar filtros en la lista de asientos.

## Cambios en Schema

### JournalEntry
```prisma
model JournalEntry {
  date DateTime? @db.Date // nullable para asientos de cierre
}
```

La fecha ahora es nullable para permitir asientos de cierre contable (`period_close`) que no tienen fecha específica.

## Cambios en Backend

### journal-entries.service.ts

**findAll**: Excluye asientos sin fecha por defecto
```typescript
const where: any = {
  NOT: { date: null }, // excluir cierres contables
};
```

**Nuevo método findAllTypes**: Retorna tipos de asientos para filtros, excluyendo `period_close`
```typescript
async findAllTypes(companyId: string): Promise<any[]> {
  const types = await tenantDb.journalEntryType.findMany({
    where: {
      key: { notIn: ['period_close'] },
    },
    orderBy: { description: 'asc' },
  });
  return types;
}
```

### journal-entries.controller.ts

**Nuevo endpoint**: `GET /journal-entries/types`
- Retorna lista de tipos de asientos para filtros
- Excluye `period_close` automaticamente

## Cambios en Frontend

### journalEntries.service.ts
- Nuevo metodo `getTypes()` para obtener tipos de asientos

### journalEntries.ts (types)
- Nuevo tipo `JournalEntryType { key, description, color }`

### JournalEntriesList.tsx
- Agregado `SearchableSelect` para filtrar por tipo de asiento
- Se cargan tipos al montar el componente
- Todos los filtros funcionan simultaneamente (busqueda + tipo + fechas)
- `handleClearFilters` limpia todos los filtros

## Tipos de Asientos Especiales

| Tipo | Descripcion | Fecha |
|------|-------------|-------|
| `period_close` | Cierres Contables | Sin fecha (null) |
| `opening_balance` | Saldos Iniciales | 1 de enero |

## Notas

- Los asientos de tipo `period_close` no aparecen en el listado normal
- Para ver cierres contables se necesitara una vista especial en `/dashboard/accounting/closing`
- El campo `date` usa `@db.Date` (solo dia/mes/año, sin hora)
