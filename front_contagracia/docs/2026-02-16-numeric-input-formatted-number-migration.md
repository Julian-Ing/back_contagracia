# Migracion a NumericInput y FormattedNumber en todos los modulos contables

## Contexto

Para que todos los valores numericos respeten la configuracion `display_decimals` de la empresa, se migraron todos los inputs y displays numericos de los modulos contables a los componentes centralizados:

- **`NumericInput`** — input numerico que lee `displayDecimals` de `CompanySettingsContext` como `maxDecimals`
- **`FormattedNumber`** (JSX) — display formateado que lee `displayDecimals` del contexto
- **`useFormatNumber()`** hook — para formateo en toasts/strings fuera de JSX

## Componentes

### NumericInput (`shared/components/ui/numeric-input.tsx`)

- Lee `CompanySettingsContext.displayDecimals` como default de `maxDecimals`
- Usa `decimal.js` con `ROUND_HALF_UP` para redondeo preciso
- No permite escribir mas decimales que `maxDecimals`
- Auto-corrige valores de BD con mas decimales que la config

### FormattedNumber (`shared/components/ui/formatted-number.tsx`)

- Lee `CompanySettingsContext.displayDecimals` como default de `decimals`
- Usa `formatCurrencyCO` / `formatNumberCO` / `formatPercentCO` internamente
- Todas las funciones de formato pre-redondean con `decimal.js`

### useFormatNumber (`shared/hooks/useFormatNumber.ts`)

- Hook que retorna `{ formatCurrency, formatNumber, formatPercent }`
- Lee `displayDecimals` del contexto
- Para uso en toasts, strings, y cualquier lugar fuera de JSX

## Modulos migrados

### CxC y CxP (`accounts-receivable/page.tsx`, `accounts-payable/page.tsx`)

- Tablas: montos con `<FormattedNumber>`
- BalanceDetailModal: todos los montos con `<FormattedNumber>`

### Banking (`banking/page.tsx`)

- Tabla de cuentas: saldos con `<FormattedNumber>`
- Modal de movimiento: monto con `<NumericInput>`

### Prepayments (`prepayments/` pages)

- Tabla: montos con `<FormattedNumber>`
- CreatePrepaymentModal: monto con `<NumericInput>`
- PrepaymentDetailModal: montos con `<FormattedNumber>`

### Journal Entries (`journal-entries/` pages)

- Tabla listado: montos con `<FormattedNumber>`
- Form (`new/page.tsx`): monto con `<NumericInput>`
- Totales: con `<FormattedNumber>` y `useFormatNumber()` para toasts
- DetailModal: montos con `<FormattedNumber>`

### Taxes (`taxes/` components)

- TaxesList: rate con `<FormattedNumber>`
- TaxFormModal: rate con `<NumericInput>`

### Payment Receipts (`ar-ap/components/PaymentReceiptForm.tsx`)

- Debit/credit inputs con `<NumericInput>`
- Totales y displays con `<FormattedNumber>`

## Regla: NUNCA usar inputs/formateo raw

En modulos contables, esta prohibido:
- `<Input type="number">` → usar `<NumericInput>`
- `formatCurrencyCO()` directo → usar `<FormattedNumber>` o `useFormatNumber()`
- `Intl.NumberFormat` directo → usar `<FormattedNumber>` o `useFormatNumber()`
- `.toLocaleString()` → usar `<FormattedNumber>` o `useFormatNumber()`
- `.toFixed()` para redondeo → usar `decimal.js` con `ROUND_HALF_UP`

## Verificacion

Buscar violaciones:
```bash
# No debe haber type="number" en modulos contables
grep -r 'type="number"\|type={.number.}' src/app/dashboard/{accounting,accounts-receivable,accounts-payable,banking,prepayments} src/modules/{ar-ap,taxes,journal-entries}
# Resultado esperado: 0 matches
```

## Archivos modificados (commits del 15 de febrero)

| Commit | Archivos |
|--------|----------|
| `c4095dc` | `formatNumber.ts`, `numeric-input.tsx` — decimal.js precision |
| `b866ab2` | CxC, CxP, BalanceDetailModal → FormattedNumber |
| `16e3ad8` | Banking → FormattedNumber + NumericInput |
| `8559e0e` | Prepayments → FormattedNumber |
| `559d2b9` | Journal Entries views → FormattedNumber |
| `a3e3f1c` | useFormatNumber hook |
| `9190e25` | Journal entry form totals → FormattedNumber/useFormatNumber |
| `9e7f966` | TaxesList rate → FormattedNumber |
| `7d9b70c` | TaxFormModal rate → NumericInput |
