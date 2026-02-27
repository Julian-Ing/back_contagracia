# Sistema de Consecutivos

Sistema para asignar números consecutivos automáticos a registros (facturas, asientos contables, movimientos bancarios, etc.).

## Tablas

### `consecutive_types`

Catálogo de tipos de consecutivo disponibles en el sistema.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `type` | String (PK) | Identificador único (ej: `journal_entry`, `bank_movement`) |
| `default_prefix` | String | Prefijo por defecto (ej: `JE`, `MB`, `FV`) |
| `description` | String | Descripción legible |
| `table_name` | String? | Nombre del modelo Prisma (para referencia) |
| `field_name` | String | Campo donde va el consecutivo (default: `consecutive`) |
| `condition_field` | String? | Campo para condición (ej: `doc_type`) |
| `condition_value` | String? | Valor de la condición (ej: `INVOICE`) |

### `consecutives`

Contador actual de cada tipo de consecutivo por tenant.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `type` | String (PK) | Referencia a `consecutive_types.type` |
| `prefix` | String | Prefijo actual (puede ser personalizado por empresa) |
| `last_number` | Int | Último número asignado |
| `padding` | Int | Cantidad de dígitos (default: 6) |

## Seeders

### Ubicación
```
contagracia-shared-modules/prisma/seeds/consecutiveTypes.ts
```

### Tipos Disponibles

#### Documentos
| type | prefix | descripción |
|------|--------|-------------|
| `invoice` | FV | Factura de Venta |
| `invoice_credit_note` | NC | Nota Crédito Venta |
| `invoice_debit_note` | ND | Nota Débito Venta |
| `purchase` | CO | Compra |
| `expense` | GA | Gasto |

#### Contabilidad
| type | prefix | descripción |
|------|--------|-------------|
| `journal_entry` | JE | Asiento Contable |
| `bank_movement` | MB | Movimiento Bancario |
| `payment_receipt` | REC | Recibo de Caja |
| `bank_reconciliation` | BC | Conciliación Bancaria |

#### Inventario
| type | prefix | descripción |
|------|--------|-------------|
| `product` | ART | Producto/Artículo |
| `product_movement` | IM | Movimiento de Producto |
| `storage_transfer` | TI | Traslado entre Bodegas |

### Sincronización a Tenants

El script `seed-all-tenants.ts` copia los tipos de consecutivo a cada tenant:

```typescript
// Consecutive Types
for (const item of consecutiveTypes) {
  await tenantPrisma.consecutiveType.upsert({
    where: { type: item.type },
    update: { ... },
    create: { ... },
  });
}

// Consecutives (inicializa contadores en 0)
for (const item of consecutiveTypes) {
  await tenantPrisma.consecutive.upsert({
    where: { type: item.type },
    update: {},
    create: {
      type: item.type,
      prefix: item.default_prefix,
      last_number: 0,
    },
  });
}
```

## Función `getNextConsecutive`

### Ubicación
```
accounting-service/src/functions/get-next-consecutive.ts
```

### Firma
```typescript
export async function getNextConsecutive(tx: any, type: string): Promise<string>
```

### Parámetros
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `tx` | any | Cliente de transacción de Prisma |
| `type` | string | Tipo de consecutivo (ej: `journal_entry`) |

### Retorno
Consecutivo formateado: `{prefix}-{número con padding}`

Ejemplos: `JE-000001`, `MB-000042`, `FV-001234`

### Uso

**IMPORTANTE:** Usar SOLO después de todas las validaciones y dentro de una transacción para:
1. No inflar el consecutivo si algo falla
2. Garantizar atomicidad con el lock `FOR UPDATE`

```typescript
import { getNextConsecutive } from './get-next-consecutive';

// Ejemplo: crear asiento contable
const entry = await prisma.$transaction(async (tx) => {
  // Obtener consecutivo con lock
  const consecutive = await getNextConsecutive(tx, 'journal_entry');

  // Crear registro con el consecutivo
  return tx.journalEntry.create({
    data: {
      consecutive,
      date: new Date(),
      description: 'Mi asiento',
      // ...
    },
  });
});
```

### Funcionamiento Interno

1. Ejecuta `SELECT ... FOR UPDATE` para bloquear el registro
2. Incrementa `last_number` en 1
3. Formatea el consecutivo con padding
4. Retorna el consecutivo

```sql
SELECT type, last_number, prefix, padding
FROM consecutives
WHERE type = 'journal_entry'
FOR UPDATE
```

## Ejemplos de Implementación

### create-bank-movement.ts

```typescript
const result = await prisma.$transaction(async (tx: any) => {
  const consecutive = await getNextConsecutive(tx, 'bank_movement');

  const movement = await tx.bankMovement.create({
    data: {
      consecutive,
      bank_account_id: params.bank_account_id,
      amount: params.amount,
      // ...
    },
  });

  await tx.bankAccount.update({
    where: { id: params.bank_account_id },
    data: { current_balance: newBalance },
  });

  return { movement, consecutive };
});
```

### create-journal-entry.ts

```typescript
const entry = await prisma.$transaction(async (tx: any) => {
  const consecutive = await getNextConsecutive(tx, 'journal_entry');

  return tx.journalEntry.create({
    data: {
      consecutive,
      date: params.date,
      description: params.description,
      type_key: params.type_key,
      items: {
        create: items.map(item => ({ ... })),
      },
    },
  });
});
```

## Personalización por Empresa

Cada empresa puede personalizar el prefijo editando la tabla `consecutives`:

```sql
UPDATE consecutives
SET prefix = 'FACT'
WHERE type = 'invoice';
```

El siguiente consecutivo será: `FACT-000001`
