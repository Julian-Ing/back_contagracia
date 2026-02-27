# Soporte para Asientos de Cierre sin Fecha

## Descripción

Los asientos de cierre contable (`period_close`) y sus reversiones no tienen fecha asociada, ya que representan operaciones de cierre de período que no corresponden a una fecha específica de transacción.

## Cambios Realizados

### 1. CreateJournalEntryParams

La interfaz ahora acepta fecha opcional:

```typescript
export interface CreateJournalEntryParams {
  date?: Date; // Opcional para asientos de cierre (period_close y su reversal)
  description?: string;
  type_key: string;
  reference_id?: string;
  items: JournalEntryItemInput[];
}
```

### 2. Función canHaveNullDate

Nueva función que determina si un tipo de asiento puede tener fecha null:

```typescript
async function canHaveNullDate(
  prisma: PrismaClientTenant,
  typeKey: string,
  referenceId?: string
): Promise<boolean> {
  // period_close siempre puede tener fecha null
  if (typeKey === 'period_close') return true;

  // reversal de un period_close también puede tener fecha null
  if (typeKey === 'reversal' && referenceId) {
    const originalEntry = await prisma.journalEntry.findUnique({
      where: { id: referenceId },
      select: { type_key: true },
    });
    if (originalEntry?.type_key === 'period_close') return true;
  }

  return false;
}
```

### 3. Validación de Fecha

La función `createJournalEntry` ahora valida:

1. Si no hay fecha y el tipo NO permite null → Error
2. Si no hay fecha y el tipo SÍ permite null → Continúa
3. La validación de período abierto solo se ejecuta si hay fecha

## Tipos de Asiento Relevantes (Seeder)

| Key | Descripción | Permite fecha null |
|-----|-------------|-------------------|
| `period_close` | Cierres Contables | Sí |
| `reversal` | Reversiones de Asientos | Solo si revierte un `period_close` |

## Permisos Agregados (accounting.ts)

```typescript
{ action_key: 'accounting.closing_accounts.configure', action_name: 'Configurar Cuentas de Cierre', description: 'Configurar cuentas para cierre contable' },
{ action_key: 'accounting.closing_entries.view', action_name: 'Ver Asientos de Cierre', description: 'Ver asientos generados por cierre contable' },
```

## Uso

### Crear asiento de cierre (sin fecha)

```typescript
await createJournalEntry(tenantContext, companyId, {
  // date: undefined - no se proporciona fecha
  description: 'Cierre del período Enero 2025',
  type_key: 'period_close',
  items: [
    { account_code: '4135', amount: 15000000, type: 'DEBIT', description: 'Cierre ingresos' },
    { account_code: '5105', amount: 3000000, type: 'CREDIT', description: 'Cierre gastos' },
    { account_code: '6135', amount: 4000000, type: 'CREDIT', description: 'Cierre costos' },
    { account_code: '360505', amount: 8000000, type: 'CREDIT', description: 'Utilidad del ejercicio' },
  ],
});
```

### Reversar asiento de cierre

```typescript
await createJournalEntry(tenantContext, companyId, {
  // date: undefined - no se proporciona fecha
  description: 'Reversión cierre período Enero 2025',
  type_key: 'reversal',
  reference_id: 'id-del-asiento-de-cierre-original',
  items: [
    // Items invertidos del asiento original
  ],
});
```
