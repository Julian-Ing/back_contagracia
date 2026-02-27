# Sistema de Asientos Contables (Journal Entries)

## Backend

### Servicio: `journal-entries.service.ts`

Ubicación: `accounting-service/src/modules/journal-entries/`

#### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/journal-entries` | Listar asientos con paginación y filtros |
| GET | `/journal-entries/:id` | Obtener detalle de un asiento |

#### Filtros disponibles

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `search` | string | Buscar por consecutivo o descripción |
| `type_key` | string | Filtrar por tipo de asiento |
| `from_date` | string | Fecha desde (YYYY-MM-DD) |
| `to_date` | string | Fecha hasta (YYYY-MM-DD) |
| `page` | number | Página (default: 1) |
| `limit` | number | Límite por página (default: 20) |

#### Respuesta

```json
{
  "data": [{
    "id": "uuid",
    "consecutive": "JE-000001",
    "date": "2026-02-06",
    "description": "Saldo inicial - Caja Principal",
    "type_key": "bank_account_opening",
    "type_description": "Apertura de Cuenta Bancaria",
    "type_color": "#10B981",
    "total_debit": 5000000,
    "total_credit": 5000000,
    "is_reversed": false,
    "reversed_by": null,
    "created_at": "2026-02-06T10:30:00Z"
  }],
  "total": 50,
  "page": 1,
  "limit": 20,
  "totalPages": 3,
  "hasMore": true
}
```

### Función: `createJournalEntry`

Ubicación: `accounting-service/src/functions/create-journal-entry.ts`

#### Uso

```typescript
import { createJournalEntry } from '../functions';

const result = await createJournalEntry(tenantContext, companyId, {
  date: new Date(),
  description: 'Asiento de ejemplo',
  type_key: 'manual',
  items: [
    {
      account_code: '110505',
      amount: 1000000,
      type: 'DEBIT',
      description: 'Caja general',
      bank_account_id: 'uuid-caja',
    },
    {
      account_code: '410505',
      amount: 1000000,
      type: 'CREDIT',
      description: 'Ingresos',
    },
  ],
});

console.log(result.consecutive); // JE-000001
```

#### Validaciones

1. Descripción general requerida
2. Mínimo 2 líneas con monto
3. Descripción requerida en cada línea
4. Todas las cuentas deben existir en chart_of_accounts
5. Terceros deben existir si se proporcionan
6. Cuentas 1110* requieren bank_account tipo SAVINGS/CHECKING
7. Cuentas 1105* requieren bank_account tipo CASH
8. Otras cuentas NO pueden tener bank_account
9. Débitos = Créditos (balanceado)
10. Cuentas de orden (7, 8, 9) solo entre ellas

## Frontend

### Componente: `JournalEntriesList`

Ubicación: `src/modules/accounting/components/JournalEntriesList.tsx`

#### Props

```typescript
interface JournalEntriesListProps {
  // No requiere props, usa hooks internos
}
```

#### Características

- Tabla con columnas: Consecutivo, Fecha, Tipo, Descripción, Débito, Crédito, Estado
- Badge de color por tipo de asiento (color desde BD)
- Indicador de asientos reversados
- Búsqueda por consecutivo/descripción
- Filtro por tipo de asiento
- Filtro por rango de fechas
- Paginación

### Hook: `useJournalEntries`

```typescript
const {
  journalEntries,  // Lista de asientos
  total,           // Total de registros
  page,            // Página actual
  totalPages,      // Total de páginas
  loading,         // Estado de carga
  error,           // Error si existe
  search,          // Función para buscar
  filterByType,    // Función para filtrar por tipo
  filterByDates,   // Función para filtrar por fechas
  setPage,         // Función para cambiar página
  refetch,         // Función para recargar
} = useJournalEntries({ limit: 20 });
```

### Servicio: `journalEntriesService`

```typescript
import { journalEntriesService } from '@/modules/accounting';

// Listar asientos
const result = await journalEntriesService.getAll({
  search: 'JE-0001',
  type_key: 'manual',
  from_date: '2026-01-01',
  to_date: '2026-12-31',
  page: 1,
  limit: 20,
});

// Obtener detalle
const entry = await journalEntriesService.getById('uuid');
```

## Tipos de Asiento

Los tipos están en `journal_entry_types` con colores hexadecimales:

| key | descripción | color |
|-----|-------------|-------|
| `manual` | Asiento Manual | #6B7280 |
| `invoice` | Factura de Venta | #22C55E |
| `bank_account_opening` | Apertura Cuenta Bancaria | #10B981 |
| `reversal` | Reversión de Asiento | #EF4444 |
| ... | (61 tipos en total) | ... |

Los colores se almacenan en la BD y se muestran como badges en la UI.
