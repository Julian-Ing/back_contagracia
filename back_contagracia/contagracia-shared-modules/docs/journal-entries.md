# Asientos Contables (Journal Entries)

## Descripcion General

Sistema de asientos contables manuales con validaciones de clases de cuentas.

## Funcion createJournalEntry

Ubicacion: `accounting-service/src/functions/create-journal-entry.ts`

### Parametros

```typescript
interface JournalEntryItemInput {
  account_code: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  description?: string;
  third_party_id?: string;
  bank_account_id?: string;
}

interface CreateJournalEntryParams {
  date: Date;
  description?: string;
  type_key: string;      // Referencia a JournalEntryType (65 tipos)
  reference_id?: string; // ID del documento origen
  items: JournalEntryItemInput[];
}
```

### Uso

```typescript
import { createJournalEntry } from '../functions';

await createJournalEntry(tenantContext, companyId, {
  date: new Date(),
  description: 'Asiento manual',
  type_key: 'manual',
  items: [
    { account_code: '110505', amount: 1000, type: 'DEBIT' },
    { account_code: '410505', amount: 1000, type: 'CREDIT' },
  ]
});
```

## Validaciones

### Clases de Cuenta (7, 8, 9)

Las cuentas de clase 7, 8 y 9 (orden/produccion) **solo pueden tener movimientos entre ellas mismas**.

- Clase 7: Costos de Produccion
- Clase 8: Cuentas de Orden Deudoras
- Clase 9: Cuentas de Orden Acreedoras

**Excepciones:**
- `opening_balance`: Saldos iniciales (pueden mezclar cualquier cuenta)
- `reversal` de un `opening_balance`: Reversiones de saldos iniciales

### Ejemplo Valido

```typescript
// OK: Solo cuentas de orden
items: [
  { account_code: '810505', amount: 1000, type: 'DEBIT' },
  { account_code: '910505', amount: 1000, type: 'CREDIT' },
]

// OK: Solo cuentas regulares
items: [
  { account_code: '110505', amount: 1000, type: 'DEBIT' },
  { account_code: '410505', amount: 1000, type: 'CREDIT' },
]
```

### Ejemplo Invalido

```typescript
// ERROR: Mezcla cuentas 8* con cuentas 1*
items: [
  { account_code: '810505', amount: 1000, type: 'DEBIT' },
  { account_code: '110505', amount: 1000, type: 'CREDIT' },
]
// Lanza: "Las cuentas de clase 7, 8 y 9 (orden/produccion) solo pueden tener movimientos entre ellas mismas"
```

## Tipos de Asiento (JournalEntryType)

65 tipos predefinidos en `seed-journal-entry-types.ts`:

| Key | Descripcion |
|-----|-------------|
| `manual` | Manual |
| `opening_balance` | Saldos Iniciales |
| `reversal` | Reversiones de Asientos |
| `invoice` | Facturas de Venta |
| `purchase` | Compras |
| `expense` | Gastos |
| `payroll` | Liquidacion de Nomina |
| `bank_adjustment` | Ajustes Bancarios |
| ... | (ver seed completo) |

## Permisos

| Permiso | Descripcion |
|---------|-------------|
| `journal_entries.view` | Ver asientos |
| `journal_entries.create` | Crear asiento |
| `journal_entries.edit` | Editar asiento |
| `journal_entries.reverse` | Reversar asiento |

## Archivos Relacionados

- `accounting-service/src/functions/create-journal-entry.ts` - Funcion principal
- `accounting-service/src/functions/index.ts` - Exports
- `prisma/seeds/seed-journal-entry-types.ts` - Tipos de asiento
- `prisma/seeds/modules/actions/accounting.ts` - Permisos
