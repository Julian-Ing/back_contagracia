# Sistema de Cierre y Reapertura de Periodos - Frontend

## Descripcion

Modulo completo para gestionar el cierre y reapertura de periodos contables, incluyendo preview de cierre, configuracion de cuentas y historial de acciones.

## Componentes

### 1. AccountingPeriodsList.tsx

Lista principal de periodos contables con acciones.

**Ubicacion:** `src/modules/accounting/components/AccountingPeriodsList.tsx`

**Funcionalidades:**
- Lista paginada de periodos
- Filtros por estado (OPEN, CLOSED, REOPENED) y tipo (Anual, Mensual)
- Busqueda por nombre o consecutivo
- Acciones: Cerrar, Reabrir, Ver historial

**Permisos:**
| Permiso | Accion |
|---------|--------|
| `closing.monthly.create` | Crear periodo mensual |
| `closing.annual.create` | Crear periodo anual |
| `closing.monthly.close` | Cerrar periodo mensual |
| `closing.annual.close` | Cerrar periodo anual |
| `closing.monthly.reopen` | Reabrir periodo mensual |
| `closing.annual.reopen` | Reabrir periodo anual |

**Estados y colores:**
```typescript
const STATUS_COLORS: Record<PeriodStatus, { bg: string; text: string }> = {
  OPEN: { bg: 'bg-green-100', text: 'text-green-700' },
  CLOSED: { bg: 'bg-red-100', text: 'text-red-700' },
  REOPENED: { bg: 'bg-amber-100', text: 'text-amber-700' },
};
```

### 2. ClosingPreviewModal.tsx

Modal para preview y confirmacion de cierre de periodo.

**Ubicacion:** `src/modules/accounting/components/ClosingPreviewModal.tsx`

**Funcionalidades:**
- Resumen de ingresos (clase 4), gastos (clase 5) y costos (clase 6)
- Calculo de utilidad neta
- Vista expandible con todos los movimientos
- Filtros por categoria, cuenta y busqueda
- Paginacion de movimientos
- Configuracion de cuentas de cierre y apertura
- Navegacion a detalle de asientos

**Props:**
```typescript
interface ClosingPreviewModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: ClosingConfirmData) => Promise<void>;
  period: AccountingPeriod | null;
}

interface ClosingConfirmData {
  reason: string;
  closingAccountCode: string;   // Ej: "360505" - Utilidad del ejercicio
  openingAccountCode: string;   // Ej: "37050501" - Resultados anteriores
}
```

**Permisos:**
| Permiso | Uso |
|---------|-----|
| `closing.periods.view` | Ver boton "Ver Detalle" |
| `journal_entries.view_detail` | Navegar a detalle de asiento |
| `accounting.closing_accounts.configure` | Editar cuentas de cierre/apertura |

**Cuentas de configuracion (AccountingConfig):**
- `accounting_retained_earnings`: Cuenta de utilidad del ejercicio (prefijo 36)
- `accounting_previous_year_results`: Cuenta de resultados anteriores (prefijo 37)

### 3. PeriodConfirmModal.tsx

Modal de confirmacion para cerrar o reabrir periodo.

**Ubicacion:** `src/modules/accounting/components/PeriodConfirmModal.tsx`

**Uso:**
- `actionType="close"`: Confirmacion de cierre (usa ClosingPreviewModal en su lugar)
- `actionType="reopen"`: Confirmacion de reapertura

**Props:**
```typescript
interface PeriodConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  period: AccountingPeriod | null;
  actionType: 'close' | 'reopen';
}
```

**Manejo de errores:**
```typescript
const message = err.response?.data?.message || err.message || 'Error al procesar la acción';
setError(message);
```

### 4. PeriodActionsModal.tsx

Modal para ver historial de acciones del periodo.

**Ubicacion:** `src/modules/accounting/components/PeriodActionsModal.tsx`

**Funcionalidades:**
- Lista paginada de acciones (OPEN, CLOSE, REOPEN, ADJUST)
- Filtros por tipo de accion, fecha y busqueda
- Columna "Asiento" con link a detalle (si tiene permiso)
- Modal de JournalEntryDetail integrado

**Tamaño:** 900px de ancho

**Props:**
```typescript
interface PeriodActionsModalProps {
  open: boolean;
  onClose: () => void;
  period: AccountingPeriod | null;
}
```

**Tipos de accion y colores:**
```typescript
const ACTION_COLORS: Record<PeriodActionType, string> = {
  OPEN: 'bg-green-100 text-green-700',
  CLOSE: 'bg-red-100 text-red-700',
  REOPEN: 'bg-amber-100 text-amber-700',
  ADJUST: 'bg-blue-100 text-blue-700',
};
```

**Permisos:**
| Permiso | Uso |
|---------|-----|
| `accounting.closing_entries.view` | Mostrar columna "Asiento" |

### 5. JournalEntryDetail.tsx

Modal/vista de detalle de asiento contable.

**Ubicacion:** `src/modules/accounting/components/JournalEntryDetail.tsx`

**Soporte para fecha null:**
```typescript
interface JournalEntryDetailData {
  date: string | null;  // null para asientos de cierre
  // ...
}

// Visualizacion
{entry.date
  ? formatDateLong(entry.date)
  : 'Sin fecha (cierre)'}
```

**Tamaño:** 1000px de ancho

## Tipos

### accountingPeriods.ts

```typescript
export type PeriodStatus = 'OPEN' | 'CLOSED' | 'REOPENED';
export type PeriodActionType = 'OPEN' | 'CLOSE' | 'REOPEN' | 'ADJUST';

export interface AccountingPeriod {
  id: string;
  consecutive: string;
  name: string;
  start_date: string;
  end_date: string;
  year: number;
  is_annual: boolean;
  parent_period_id?: string;
  parent_period_name?: string;
  status: PeriodStatus;
  closed_at?: string;
  closed_by?: string;
  reopened_at?: string;
  reopened_by?: string;
  description?: string;
  actions_count: number;
  child_periods_count: number;
  created_at: string;
}

export interface AccountingPeriodAction {
  id: string;
  action: PeriodActionType;
  reason?: string;
  journal_entry_id?: string;
  journal_entry_consecutive?: string;
  created_by?: string;
  created_at: string;
}

export interface ClosingPreviewResult {
  period: { ... };
  income: AccountBalanceResult;   // Clase 4
  expenses: AccountBalanceResult; // Clase 5
  costs: AccountBalanceResult;    // Clase 6
  net_income: number;             // Utilidad neta
}

export interface ClosingConfirmData {
  reason: string;
  closingAccountCode: string;
  openingAccountCode: string;
}
```

## Servicio

### accountingPeriods.service.ts

```typescript
class AccountingPeriodsService {
  // Listar periodos
  async getAll(params?: QueryParams): Promise<PaginatedResponse<AccountingPeriod>>

  // Obtener periodo por ID
  async getOne(id: string): Promise<AccountingPeriod>

  // Crear periodo
  async create(data: CreatePeriodDto): Promise<AccountingPeriod>

  // Cerrar periodo
  async close(id: string, data: ClosingConfirmData): Promise<AccountingPeriod>

  // Reabrir periodo
  async reopen(id: string, reason: string): Promise<AccountingPeriod>

  // Listar acciones de un periodo
  async getActions(periodId: string, params?: QueryParams): Promise<PaginatedResponse<AccountingPeriodAction>>

  // Preview de cierre
  async getClosingPreview(periodId: string): Promise<ClosingPreviewResult>
}
```

## Hook

### useAccountingPeriods.ts

```typescript
function useAccountingPeriods(options?: { limit?: number }) {
  return {
    periods: AccountingPeriod[],
    total: number,
    page: number,
    totalPages: number,
    loading: boolean,
    error: string | null,
    search: (query: string) => void,
    filterByStatus: (status?: PeriodStatus) => void,
    filterByAnnual: (isAnnual?: boolean) => void,
    setPage: (page: number) => void,
    createPeriod: (data: CreatePeriodDto) => Promise<void>,
    closePeriod: (id: string, data: ClosingConfirmData) => Promise<void>,
    reopenPeriod: (id: string, reason: string) => Promise<void>,
  };
}
```

## Flujos

### Cierre de Periodo

1. Usuario hace clic en icono Lock en periodo OPEN/REOPENED
2. Se abre `ClosingPreviewModal`
3. Usuario puede ver detalle de movimientos (opcional)
4. Usuario selecciona cuentas de cierre y apertura
5. Usuario ingresa razon
6. Click en "Cerrar Período"
7. Backend genera asientos de cierre y apertura
8. Periodo cambia a estado CLOSED

### Reapertura de Periodo

1. Usuario hace clic en icono Unlock en periodo CLOSED
2. Se abre `PeriodConfirmModal` con actionType="reopen"
3. Usuario ingresa razon
4. Click en "Reabrir Período"
5. Backend genera reversiones de cierre y apertura
6. Periodo cambia a estado REOPENED

### Ver Historial

1. Usuario hace clic en icono Eye
2. Se abre `PeriodActionsModal`
3. Lista todas las acciones (OPEN, CLOSE, REOPEN, ADJUST)
4. Si tiene permiso, puede hacer clic en consecutivo de asiento
5. Se abre `JournalEntryDetail` con el asiento

## Archivos

- `src/modules/accounting/components/AccountingPeriodsList.tsx`
- `src/modules/accounting/components/ClosingPreviewModal.tsx`
- `src/modules/accounting/components/PeriodConfirmModal.tsx`
- `src/modules/accounting/components/PeriodActionsModal.tsx`
- `src/modules/accounting/components/JournalEntryDetail.tsx`
- `src/modules/accounting/types/accountingPeriods.ts`
- `src/modules/accounting/services/accountingPeriods.service.ts`
- `src/modules/accounting/hooks/useAccountingPeriods.ts`
