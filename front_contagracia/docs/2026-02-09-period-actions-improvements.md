# Mejoras en Modales de Periodos Contables - 2026-02-09

## Resumen

Mejoras en los modales de acciones de periodos y detalle de asientos contables.

## Cambios

### 1. PeriodActionsModal.tsx

#### Columna de Asiento

Se agrego columna "Asiento" para ver los asientos asociados a cada accion:

```tsx
// Permiso requerido
const { can } = usePermissions();
const canViewClosingEntries = can('accounting.closing_entries.view');

// Columna condicional
{canViewClosingEntries && (
  <TableHead>Asiento</TableHead>
)}

// Celda con link al asiento
{canViewClosingEntries && (
  <TableCell>
    {action.journal_entry_id ? (
      <button onClick={() => setSelectedJournalEntryId(action.journal_entry_id)}>
        <FileText className="h-3.5 w-3.5" />
        {action.journal_entry_consecutive}
      </button>
    ) : (
      <span>Sin asiento</span>
    )}
  </TableCell>
)}
```

#### Modal de Detalle de Asiento

Se integro `JournalEntryDetail` para ver asientos desde el historial:

```tsx
{selectedJournalEntryId && (
  <JournalEntryDetail
    entryId={selectedJournalEntryId}
    mode="modal"
    open={!!selectedJournalEntryId}
    onClose={() => setSelectedJournalEntryId(null)}
    onNavigateToEntry={setSelectedJournalEntryId}
  />
)}
```

#### Ancho del Modal

Aumentado de 700px a 900px:

```tsx
<DialogContent className="sm:max-w-[900px] ...">
```

### 2. JournalEntryDetail.tsx

#### Soporte para Fecha Null

Los asientos de cierre (`period_close`) no tienen fecha. Se actualizo la interfaz:

```typescript
interface JournalEntryDetailData {
  // ...
  date: string | null;  // Antes: string
  // ...
}
```

#### Visualizacion de Fecha Null

```tsx
<span>
  {entry.date
    ? formatDateLong(entry.date)
    : 'Sin fecha (cierre)'}
</span>
```

#### Ancho del Modal

Aumentado de 800px a 1000px:

```tsx
<DialogContent className="sm:max-w-[1000px] ...">
```

### 3. PeriodConfirmModal.tsx

#### Manejo de Errores

Mejorada la extraccion del mensaje de error del backend:

```typescript
// ANTES (no extraia mensaje del backend):
setError(err.message || 'Error al procesar la acción');

// AHORA (extrae mensaje correcto):
const message = err.response?.data?.message || err.message || 'Error al procesar la acción';
setError(message);
```

Esto permite mostrar mensajes como:
- "El período contable \"Año 2026\" está cerrado"
- "Ya existen 2 períodos anuales activos"

## Permisos

| Permiso | Descripcion | Uso |
|---------|-------------|-----|
| `accounting.closing_entries.view` | Ver asientos de cierre | Muestra columna "Asiento" en historial |

## Archivos Modificados

- `front_contagracia/src/modules/accounting/components/PeriodActionsModal.tsx`
- `front_contagracia/src/modules/accounting/components/JournalEntryDetail.tsx`
- `front_contagracia/src/modules/accounting/components/PeriodConfirmModal.tsx`
