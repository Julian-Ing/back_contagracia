# Aviso de Duplicado en Asientos con Pagos

> Cuando un asiento manual tiene líneas de CxC, CxP o anticipos, el modal de duplicar muestra una advertencia.

## Cambio

**Archivo:** `src/modules/accounting/components/JournalEntryDetail.tsx`

### Tipo `JournalEntryItem`
- Agregado campo `reference_type: string` para detectar líneas no-NORMAL

### Variable `hasPaymentLines`
```typescript
const hasPaymentLines = useMemo(() => {
  if (!entry) return false;
  return entry.items.some(i => i.reference_type && i.reference_type !== 'NORMAL');
}, [entry]);
```

### Modal de Duplicar
Si `hasPaymentLines` es true, se muestra un aviso amarillo:

> "Este asiento tiene líneas de CxC, CxP o anticipos. El duplicado solo copiará los movimientos contables y bancarios — no se duplicarán pagos, documentos ni movimientos de anticipos."

## Comportamiento del Backend

El backend `duplicate()` copia todas las líneas pero con `reference_type = NORMAL` y `reference_id = null`. No se duplican pagos, ArAps, ni movimientos de anticipos.
