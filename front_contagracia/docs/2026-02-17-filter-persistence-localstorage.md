# Persistencia de Filtros en localStorage

## Resumen

Se implemento persistencia de filtros y busquedas en localStorage para todas las tablas principales del modulo de contabilidad. Cuando el usuario navega fuera y regresa, los filtros se mantienen.

## Helper

**Archivo:** `src/shared/hooks/usePersistedFilters.ts`

```ts
loadFilters<T>(key: string): Partial<T>   // Lee filtros de localStorage
saveFilters(key: string, data): void       // Guarda filtros en localStorage
```

- Prefijo: `filters:` (ej. `filters:journal-entries`)
- Exportado desde `src/shared/hooks/index.ts`

## Patron de implementacion

### En hooks

1. Leer valores guardados con `useRef(loadFilters(...)).current` (una sola vez al montar)
2. Inicializar `useState` con valores guardados
3. `useEffect` que guarda en localStorage cuando cambian los filtros

### En componentes con estado local de input

Cuando el componente tiene `searchInput` local separado del `searchTerm` del hook:
1. Mover la llamada al hook ANTES de los `useState` locales
2. Destructurar los valores guardados del hook
3. Inicializar los `useState` locales desde los valores del hook

### Reglas

- **Pagina NO se persiste** (siempre inicia en 1)
- **Filtros de modales NO se persisten**
- Solo filtros visibles en la tabla principal

## Hooks modificados

| Hook | Storage Key | Filtros persistidos |
|------|-------------|-------------------|
| `useArApSummary` | `ar-summary:RECEIVABLE` / `ar-summary:PAYABLE` | searchTerm, bucket, tab, dateFrom, dateTo, dueDateFrom, dueDateTo |
| `usePaymentReceipts` | `ar-receipts:RECEIVABLE` / `ar-receipts:PAYABLE` | searchTerm, dateFrom, dateTo |
| `usePrepayments` | `prepayments` | search, prepaymentType, status, fromDate, toDate |
| `useJournalEntries` | `journal-entries` | searchTerm, typeFilter, fromDate, toDate |
| `useChartOfAccounts` | `chart-of-accounts` | search, typeFilter |
| `useAccountingPeriods` | `accounting-periods` | searchTerm, statusFilter, annualFilter |
| `useBankAccounts` | `bank-accounts` | searchTerm, typeFilter |
| `useTaxes` | `taxes:taxes` / `taxes:withholdings` | searchTerm, taxTypeFilter |
| `useCompanyPaymentMethods` | `payment-methods` | search (debounced) |

## Paginas modificadas (account-mapping)

| Pagina | Storage Key | Filtros persistidos |
|--------|-------------|-------------------|
| `account-mapping/page.tsx` | `account-mapping` | search |

## ActiveTab persistido

| Pagina | Storage Key | Valores |
|--------|-------------|---------|
| `accounts-receivable/page.tsx` | `filters:active-tab:accounts-receivable` | `pending` / `receipts` |
| `accounts-payable/page.tsx` | `filters:active-tab:accounts-payable` | `pending` / `vouchers` |
| `TaxesList.tsx` | `filters:active-tab:tax-withholdings` | `taxes` / `withholdings` |

## Componentes con estado local sincronizado

Estos componentes tienen `searchInput` / `typeFilter` locales que se inicializan desde los valores del hook:

- `JournalEntriesList.tsx` — searchInput, fromDate, toDate, typeKey
- `AccountingPeriodsList.tsx` — searchInput, statusFilter, typeFilter
- `BankAccountsList.tsx` — searchInput, typeFilter
- `TaxesList.tsx` — searchInput, taxTypeFilter
