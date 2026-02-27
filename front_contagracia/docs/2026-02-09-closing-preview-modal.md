# Modal de Preview de Cierre

## Descripción
Modal para confirmar cierre de período con vista previa de saldos de cuentas de resultado y utilidad neta.

## Componente

`src/modules/accounting/components/ClosingPreviewModal.tsx`

## Características

### Vista Compacta
- Botón "Ver Detalle" para expandir
- Campo de razón obligatorio
- Botones Cancelar / Cerrar Período

### Vista Expandida
Al hacer click en "Ver Detalle":

#### Resumen (4 tarjetas)
- **Ingresos (4)**: Saldo y cantidad de movimientos
- **Gastos (5)**: Saldo y cantidad de movimientos
- **Costos (6)**: Saldo y cantidad de movimientos
- **Utilidad Neta**: Ingresos - Gastos - Costos (verde si ganancia, rojo si pérdida)

#### Filtros
- Búsqueda fuzzy por: descripción, consecutivo, tercero, banco, cuenta
- Selector de categoría: Todas / Ingresos / Gastos / Costos
- Selector de cuenta: Lista de todas las cuentas incluidas

#### Tabla de Movimientos
Columnas:
- Fecha
- Asiento (consecutivo)
- Cuenta (código + nombre)
- Descripción
- Tercero
- Banco
- Débito
- Crédito
- Acción (ver asiento)

Paginación frontend (20 items por página)

## Props

```typescript
interface ClosingPreviewModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  period: AccountingPeriod | null;
}
```

## Tipos Agregados

En `src/modules/accounting/types/accountingPeriods.ts`:

```typescript
interface AccountMovement {
  id: string;
  date: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  description: string | null;
  account_code: string;
  account_name: string;
  journal_entry_id: string;
  journal_entry_consecutive: string;
  journal_entry_description: string | null;
  third_party_id: string | null;
  third_party_name: string | null;
  third_party_identification: string | null;
  bank_account_id: string | null;
  bank_account_name: string | null;
}

interface AccountBalanceResult {
  account: AccountInfo;
  from_date: string;
  to_date: string;
  with_children: boolean;
  accounts_included: AccountInfo[];
  total_debits: number;
  total_credits: number;
  balance: number;
  movements: AccountMovement[];
  movements_count: number;
}

interface ClosingPreviewResult {
  period: { id, name, year, is_annual, start_date, end_date };
  income: AccountBalanceResult;
  expenses: AccountBalanceResult;
  costs: AccountBalanceResult;
  net_income: number;
}
```

## Servicio

En `accountingPeriods.service.ts`:
```typescript
async getClosingPreview(periodId: string): Promise<ClosingPreviewResult>
```

## Integración

En `AccountingPeriodsList.tsx`:
- ClosingPreviewModal para acción de cierre
- PeriodConfirmModal solo para reapertura
