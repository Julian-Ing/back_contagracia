# Journal Entries Page - Asientos Contables

## Descripción

Páginas para gestionar asientos contables manuales.

## Ubicación

- Lista: `src/app/dashboard/accounting/journal-entries/page.tsx`
- Crear: `src/app/dashboard/accounting/journal-entries/new/page.tsx`

## Permisos

| Permiso | Uso |
| ------- | --- |
| `journal_entries.view` | Ver listado |
| `journal_entries.create` | Acceder a página de creación |

## Página de Creación (new/page.tsx)

### Campos Principales

| Campo | Tipo | Requerido |
| ----- | ---- | --------- |
| `date` | Input date | Sí |
| `description` | Input text | No |

### Líneas del Asiento

| Campo | Componente | Requerido |
| ----- | ---------- | --------- |
| `account_code` | AccountSelect | Sí |
| `third_party_id` | ThirdPartySelect | No |
| `description` | Input | No |
| `type` | Toggle (DEB/CRED) | Sí |
| `amount` | NumericInput | Sí |

### Componentes Utilizados

- `ProtectedRoute` - Protección por permisos
- `AccountSelect` - Selector de cuentas contables
- `ThirdPartySelect` - Selector de terceros
- `NumericInput` - Input numérico con formato
- `Button` - Acciones

### Validaciones Frontend

```typescript
const isValid = useMemo(() => {
  if (!date) return false;
  if (lines.length < 2) return false;

  // Todas las líneas deben tener cuenta y monto > 0
  const validLines = lines.filter(l =>
    l.account_code && parseFloat(l.amount) > 0
  );
  if (validLines.length < 2) return false;

  // Débitos = Créditos
  if (Math.abs(totals.difference) > 0.001) return false;

  return true;
}, [date, lines, totals.difference]);
```

### Cálculo de Totales

```typescript
const totals = useMemo(() => {
  const debits = lines
    .filter(l => l.type === 'DEBIT')
    .reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);
  const credits = lines
    .filter(l => l.type === 'CREDIT')
    .reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);
  return { debits, credits, difference: debits - credits };
}, [lines]);
```

### UI de Totales

Muestra:
- Total Débitos (verde)
- Total Créditos (rojo)
- Diferencia (verde si 0, rojo si != 0)

## Endpoints Consumidos

| Endpoint | Método | Uso |
| -------- | ------ | --- |
| `/journal-entries` | POST | Crear asiento |

## Payload de Creación

```typescript
{
  date: string;              // YYYY-MM-DD
  description: string | null;
  type_key: 'manual';        // Siempre manual desde esta página
  items: [{
    account_code: string;
    type: 'DEBIT' | 'CREDIT';
    amount: number;
    description: string | null;
    third_party_id: string | null;
  }]
}
```

## Estado de Línea

```typescript
interface JournalEntryLine {
  id: string;              // UUID local
  account_code: string;
  account_label: string;
  third_party_id: string;
  third_party_label: string;
  type: 'DEBIT' | 'CREDIT';
  amount: string;
  description: string;
}
```

## Funcionalidades

- Agregar líneas (botón "Agregar línea")
- Eliminar líneas (mínimo 2)
- Toggle tipo DEB/CRED
- Cálculo automático de totales
- Validación de balance

## Seleccion de documentos y anticipos (reference_type)

Cuando `reference_type` es `CXC_PAID`, `CXP_PAID` o `PREP_USED`, se abre un modal para seleccionar el documento/anticipo. Al seleccionar:

- Se bloquea tercero, cuenta y tipo D/C (`is_locked = true`)
- Se valida que el monto no exceda el saldo del documento

### Auto-set D/C para PREP_USED

En `handlePrepaymentSelected`, el tipo D/C se asigna automaticamente segun el tipo de anticipo:

- **CLIENT** → `DEBIT` (anticipo de cliente es pasivo, se debita para reducir)
- **SUPPLIER** → `CREDIT` (anticipo de proveedor es activo, se acredita para reducir)
- **EMPLOYEE** → `CREDIT` (anticipo de empleado es activo, se acredita para reducir)

### SelectPrepaymentModal - Prop allowedTypes

El modal de seleccion de anticipos soporta `allowedTypes?: PrepaymentType[]` para restringir los tipos visibles en el filtro. Cuando solo hay un tipo permitido, el filtro se fija automaticamente.

## TODO

- [ ] Mejorar vista de detalle de asiento
