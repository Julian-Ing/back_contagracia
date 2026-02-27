# JournalEntryDetail - Componente Dual (Página/Modal)

## Descripción

El componente `JournalEntryDetail` ahora soporta dos modos de visualización:
- **page**: Renderiza como página completa (comportamiento original)
- **modal**: Renderiza dentro de un Dialog para uso embebido

## Props

```typescript
export interface JournalEntryDetailProps {
  entryId: string;
  mode?: 'page' | 'modal';       // default: 'page'
  open?: boolean;                 // requerido en modo modal
  onClose?: () => void;           // callback al cerrar modal
  onNavigateToEntry?: (id: string) => void; // navegación entre asientos en modal
}
```

## Uso

### Como página (comportamiento original)

```tsx
// app/dashboard/accounting/journal-entries/[id]/page.tsx
import { JournalEntryDetail } from '@/modules/accounting/components/JournalEntryDetail';

export default function JournalEntryDetailPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <ProtectedRoute permission="journal_entries.view_detail">
      <JournalEntryDetail entryId={id} mode="page" />
    </ProtectedRoute>
  );
}
```

### Como modal

```tsx
// Desde ClosingPreviewModal u otro componente
import { JournalEntryDetail } from '@/modules/accounting/components/JournalEntryDetail';

const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

// Renderizar
{selectedEntryId && (
  <JournalEntryDetail
    entryId={selectedEntryId}
    mode="modal"
    open={!!selectedEntryId}
    onClose={() => setSelectedEntryId(null)}
    onNavigateToEntry={setSelectedEntryId}
  />
)}
```

## Navegación entre asientos

- En modo **page**: Usa `router.push()` para navegar
- En modo **modal**: Llama a `onNavigateToEntry(newId)` para actualizar el ID sin cerrar el modal

## Integración con ClosingPreviewModal

El `ClosingPreviewModal` ahora incluye:

1. **Botón de ver asiento** en cada fila de movimientos (ícono Eye)
2. **Permiso requerido**: `journal_entries.view_detail`
3. **Modal anidado**: Abre el detalle del asiento sin salir del preview de cierre

```tsx
// En la tabla de movimientos
{canViewJournalDetail && (
  <Button
    variant="ghost"
    size="icon"
    onClick={() => setSelectedJournalEntryId(m.journal_entry_id)}
    title="Ver asiento"
  >
    <Eye className="h-3 w-3" />
  </Button>
)}
```

## Permisos

| Permiso | Descripción |
|---------|-------------|
| `journal_entries.view_detail` | Ver detalle de asiento (página o modal) |
| `closing.periods.view` | Ver botón "Ver Detalle de Cierre" |
| `accounting.closing_accounts.configure` | Editar cuentas de cierre/apertura |

## AccountSelect para Cuentas de Cierre

El `ClosingPreviewModal` ahora incluye dos selectores de cuenta:

1. **Cuenta de Cierre (Utilidad del Ejercicio)**
   - Config key: `accounting_retained_earnings`
   - Filtro: `includePrefixes="36"` (cuentas de resultados)

2. **Cuenta de Apertura (Resultados Anteriores)**
   - Config key: `accounting_previous_year_results`
   - Filtro: `includePrefixes="37"` (resultados anteriores)

Estos selectores solo son editables si el usuario tiene el permiso `accounting.closing_accounts.configure`.
