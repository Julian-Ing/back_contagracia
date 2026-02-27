# Asientos Contables - Frontend

## Paginas

### Lista de Asientos

- Ruta: `/dashboard/accounting/journal-entries`
- Permiso: `journal_entries.view`
- Boton "Nuevo Asiento" visible si tiene `journal_entries.create`

**Componente:** `JournalEntriesList`

**Funcionalidades:**
- Listado paginado (20 items por pagina)
- Busqueda por consecutivo o descripcion
- Filtro por tipo de asiento
- Filtro por rango de fechas
- Visualizacion de reversiones como filas hijas

**Visualizacion de reversiones:**
- Asientos reversados muestran badge "Reversado: JE-XXXX" en rojo
- Debajo aparece fila hija con el asiento de reversion
- Fila de reversion tiene fondo rojo claro y textos en rojo
- Ambas filas tienen boton para ver detalle

### Detalle de Asiento

- Ruta: `/dashboard/accounting/journal-entries/[id]`
- Permiso: `journal_entries.view_detail`

**Funcionalidades:**
- Header con consecutivo y botones de accion
- Info: Fecha, Tipo (badge con color), Estado, Descripcion
- Tabla de lineas: Cuenta, Tercero, Banco/Caja, Descripcion, Debito, Credito
- Fila de totales

**Botones de accion:**
- **Duplicar**: Visible si tiene `journal_entries.duplicate`
- **Reversar**: Visible si tiene `journal_entries.reverse` Y es tipo `manual` Y no esta reversado

**Estados visuales:**

| Estado | Badge | Link |
|--------|-------|------|
| Activo | Verde "Activo" | - |
| Reversado | Rojo "Reversado" | "Ver reversion: JE-XXXX" |
| Reversion | Rojo "Reversion" | "Ver original: JE-XXXX" |

### Nuevo Asiento

- Ruta: `/dashboard/accounting/journal-entries/new`
- Permiso: `journal_entries.create`

## Formulario de Creacion

### Campos Principales

- **Fecha**: Input date, default hoy
- **Descripcion**: Input text

### Lineas del Asiento

Minimo 2 lineas, grid de 24 columnas:

| Campo | Cols | Componente |
|-------|------|------------|
| Cuenta | 5 | AccountSelect |
| Tercero | 4 | ThirdPartySelect (excluye CONTACT) |
| Banco | 3 | BankAccountSelect (solo para 1110*/1105*) |
| Descripcion | 4 | Input |
| Tipo | 2 | Toggle DEB/CRED |
| Monto | 4 | NumericInput |
| Eliminar | 2 | Button |

### Comportamiento

- 2 lineas por defecto (1 DEBIT, 1 CREDIT)
- Boton eliminar deshabilitado si hay <=2 lineas
- Boton "Agregar linea" abajo a la derecha
- Toggle DEB (verde) / CRED (rojo)
- Selector de banco solo aparece si cuenta es 1110* o 1105*

## Modales de Confirmacion

### Modal Reversar

- Titulo: "Reversar asiento?"
- Descripcion: Explica que se creara asiento inverso
- DatePicker para fecha de reversion
- Botones: Cancelar / Reversar (rojo)

### Modal Duplicar

- Titulo: "Duplicar asiento"
- Descripcion: Explica que se creara copia
- DatePicker para fecha del duplicado
- Botones: Cancelar / Duplicar

## Componentes

### ThirdPartySelect

Selector de terceros con busqueda y paginacion.

```tsx
import { ThirdPartySelect } from '@/shared/components/ui/third-party-select';

<ThirdPartySelect
  value={thirdPartyId}
  valueLabel={thirdPartyLabel}
  onChange={(id, tp) => {
    setThirdPartyId(id);
    setThirdPartyLabel(tp ? `${tp.identification_number} - ${tp.name}` : '');
  }}
  placeholder="Seleccionar tercero..."
  excludeRoles={['CONTACT']}  // Excluir terceros con rol CONTACT
/>
```

**Props:**

| Prop | Tipo | Default | Descripcion |
|------|------|---------|-------------|
| value | string | - | ID del tercero seleccionado |
| valueLabel | string | - | Label para mostrar sin recargar |
| onChange | (id, tp?) => void | - | Callback al seleccionar |
| placeholder | string | "Seleccionar tercero..." | Placeholder |
| disabled | boolean | false | Deshabilitar |
| pageSize | number | 50 | Items por pagina |
| excludeRoles | string[] | - | Roles a excluir del listado |

**Caracteristicas:**
- Usa `companyClient` (axios) para autenticacion automatica
- Busqueda fuzzy por nombre e identificacion
- Paginacion con scroll infinito
- Boton X para deseleccionar
- Boton "Nuevo tercero" si tiene permiso `third_parties.create`
- Modal con ThirdPartyForm al crear

### AccountSelect

Selector de cuentas contables.

```tsx
import { AccountSelect } from '@/shared/components/ui/account-select';

<AccountSelect
  value={accountCode}
  valueLabel={accountLabel}
  onChange={(code, account) => {
    setAccountCode(code);
    setAccountLabel(account ? `${account.code} - ${account.name}` : '');
  }}
  placeholder="Seleccionar cuenta..."
  showCreateButton={true}
/>
```

**Permisos:**
- Boton "Nueva cuenta" visible solo si `showCreateButton=true` Y tiene `chart_of_accounts.create`

### BankAccountSelect

Selector de cuentas bancarias.

```tsx
import { BankAccountSelect } from '@/shared/components/ui/bank-account-select';

<BankAccountSelect
  value={bankAccountId}
  onChange={(id) => setBankAccountId(id)}
  filterType={isCashAccount ? 'CASH' : 'BANK'}
  placeholder="Seleccionar banco..."
/>
```

## Hooks

### useJournalEntries

```tsx
import { useJournalEntries } from '@/modules/accounting/hooks/useJournalEntries';

const {
  entries,
  total,
  page,
  totalPages,
  loading,
  error,
  search,
  filterByType,
  filterByDates,
  setPage,
} = useJournalEntries({ limit: 20 });
```

## Servicios

### journalEntriesService

```typescript
import { journalEntriesService } from '@/modules/accounting/services/journalEntries.service';

// Listar asientos
const response = await journalEntriesService.getAll({ page: 1, limit: 20 });

// Obtener detalle
const entry = await journalEntriesService.getById(id);

// Crear asiento
const result = await journalEntriesService.create(data);

// Listar tipos
const types = await journalEntriesService.getTypes();

// Reversar asiento
const reversal = await journalEntriesService.reverse(id, '2026-02-07');

// Duplicar asiento
const duplicate = await journalEntriesService.duplicate(id, '2026-02-07');
```

## Permisos Utilizados

| Permiso | Uso |
|---------|-----|
| `journal_entries.view` | Ver lista de asientos |
| `journal_entries.view_detail` | Acceder a pagina de detalle |
| `journal_entries.create` | Boton "Nuevo Asiento", pagina /new |
| `journal_entries.reverse` | Boton "Reversar" en detalle |
| `journal_entries.duplicate` | Boton "Duplicar" en detalle |

## Tipos

### JournalEntry (Lista)

```typescript
interface JournalEntry {
  id: string;
  consecutive: string;
  date: string;
  description: string | null;
  type_key: string;
  type_description: string;
  type_color: string;
  is_reversed: boolean;
  reversal_entry: {
    id: string;
    consecutive: string;
    date: string;
    description: string;
    type_key: string;
    type_description: string;
    type_color: string;
    total_debit: number;
    total_credit: number;
  } | null;
  items: JournalEntryItem[];
  total_debit: number;
  total_credit: number;
}
```

### JournalEntry (Detalle)

```typescript
interface JournalEntry {
  id: string;
  consecutive: string;
  date: string;
  description: string | null;
  type_key: string;
  reference_id: string | null;
  is_reversed: boolean;
  type: { key: string; description: string; color: string };
  items: JournalEntryItem[];
  reversal_entry: { id: string; consecutive: string } | null;
  original_entry: { id: string; consecutive: string } | null;
}
```

## Archivos

- `src/app/dashboard/accounting/journal-entries/page.tsx` - Lista
- `src/app/dashboard/accounting/journal-entries/[id]/page.tsx` - Detalle
- `src/app/dashboard/accounting/journal-entries/new/page.tsx` - Creacion
- `src/modules/accounting/components/JournalEntriesList.tsx` - Componente lista
- `src/modules/accounting/components/JournalEntryForm.tsx` - Formulario
- `src/modules/accounting/services/journalEntries.service.ts` - Servicio API
- `src/modules/accounting/hooks/useJournalEntries.ts` - Hook de estado
- `src/modules/accounting/types/journalEntries.ts` - Tipos TypeScript

## Exports

```tsx
// Desde index.ts
export { AccountSelect, type AccountSelectProps, type AccountOption } from './account-select';
export { ThirdPartySelect, type ThirdPartySelectProps, type ThirdPartyOption } from './third-party-select';
export { BankAccountSelect, type BankAccountSelectProps } from './bank-account-select';
```
