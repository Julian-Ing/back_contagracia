# Utilidades de Fecha

## Problema Resuelto
JavaScript interpreta fechas ISO como `"2026-02-07"` en UTC medianoche. Al convertir a zona horaria local (Colombia UTC-5), se muestra el día anterior.

## Solución
Parsear la fecha manualmente sin conversión de timezone.

## Archivo
`src/shared/utils/formatDate.ts`

## Funciones Disponibles

### formatDate
Formatea fecha para mostrar en tablas y listas.

```typescript
import { formatDate } from '@/shared/utils/formatDate';

formatDate('2026-02-07');           // "07 de feb de 2026"
formatDate('2026-02-07T00:00:00Z'); // "07 de feb de 2026"
formatDate('');                      // "-"
```

### formatDateTime
Formatea fecha y hora para timestamps.

```typescript
import { formatDateTime } from '@/shared/utils/formatDate';

formatDateTime('2026-02-07T14:30:00Z'); // "07 de feb de 2026, 14:30"
```

### formatDateShort
Formato corto para espacios reducidos.

```typescript
import { formatDateShort } from '@/shared/utils/formatDate';

formatDateShort('2026-02-07'); // "07/02/2026"
```

## Implementación

```typescript
export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  // Parsear como fecha local para evitar desfase de timezone
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
```

## Componentes Actualizados

Los siguientes componentes fueron actualizados para usar esta utilidad:

- `JournalEntriesList.tsx` - Lista de asientos contables
- `AccountingPeriodsList.tsx` - Lista de períodos contables
- `BankMovementsModal.tsx` - Modal de movimientos bancarios

## Uso Correcto

**Antes (incorrecto):**
```typescript
function formatDate(dateStr: string): string {
  const date = new Date(dateStr); // ❌ Problema de timezone
  return date.toLocaleDateString('es-CO', {...});
}
```

**Después (correcto):**
```typescript
import { formatDate } from '@/shared/utils/formatDate';

// Usar directamente
<span>{formatDate(entry.date)}</span>
```

## Notas
- Siempre usar esta utilidad para fechas que vienen del backend
- Para fechas con hora (timestamps), usar `formatDateTime`
- El locale es `es-CO` (Colombia) por defecto
