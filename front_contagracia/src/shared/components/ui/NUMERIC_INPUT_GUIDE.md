# NumericInput — Guia de uso

Input numerico con formato locale (es-CO), soporte de decimales configurables por tenant, y redondeo `ROUND_HALF_UP` via `decimal.js`.

## Ubicacion

`src/shared/components/ui/numeric-input.tsx`

## Props

| Prop | Tipo | Default | Descripcion |
|------|------|---------|-------------|
| `value` | `string \| number` | - | Valor controlado |
| `defaultValue` | `string \| number` | - | Valor no controlado |
| `onChange` | `(e) => void` | - | Callback con `e.target.value` normalizado (punto decimal) |
| `locale` | `string` | `'es-CO'` | Locale para formato (separador miles/decimal) |
| `allowNegative` | `boolean` | `true` | Permitir numeros negativos |
| `maxDecimals` | `number` | `displayDecimals` del tenant | Maximo de decimales permitidos |

## Comportamiento

### maxDecimals automatico

Si no se pasa `maxDecimals` como prop, el componente lee `displayDecimals` del `CompanySettingsContext` automaticamente. Esto limita la entrada de decimales segun la configuracion del tenant.

### Normalizacion de entrada

La funcion `normalizeForChange` convierte cualquier formato de entrada a formato estandar con punto decimal:

- `"1.234,56"` → `"1234.56"` (es-CO)
- `"1,234.56"` → `"1234.56"` (en-US)
- `","` o `"."` → `"0."` (prefija 0 para evitar `DecimalError`)
- `",5"` o `".5"` → `"0.5"`

### Display

- **Con foco**: muestra separador decimal del locale, sin miles (ej: `1234,56`)
- **Sin foco**: formateado completo con miles y redondeo (ej: `1.234,56`)

### Redondeo

Usa `Decimal.ROUND_HALF_UP` para redondear al maximo de decimales permitidos (misma logica que el backend).

## Validacion de maximo en formularios

Los formularios de asientos manuales y recibos de pago validan el monto maximo contra el saldo de documentos/anticipos.

### Redondeo del maximo (`roundMax`)

Ambos formularios redondean `ref_max_amount` usando `displayDecimals` + `ROUND_HALF_UP` al momento de asignar el saldo del documento:

```typescript
const roundMax = useCallback((val: number) =>
  dd !== undefined ? new Decimal(val).toDecimalPlaces(dd, Decimal.ROUND_HALF_UP).toNumber() : val,
[dd]);

// Al seleccionar documento:
ref_max_amount: roundMax(doc.balance)  // no doc.balance crudo
```

Esto garantiza que el usuario pueda ingresar el monto redondeado que ve en pantalla (ej: con `display_decimals=0` y saldo real `$2000.67`, el max es `$2001`).

### Effective max (multiples lineas mismo doc)

Si el mismo documento aparece en varias lineas, el max disponible se calcula descontando lo asignado en otras lineas:

```typescript
const effectiveMax = ref_max_amount - sum(otras lineas con mismo ref_id)
```

### Archivos que implementan esta logica

| Archivo | Donde se aplica |
|---------|----------------|
| `journal-entries/new/page.tsx` | `handleDocSelected`, `handlePrepaymentSelected`, `lineErrorsMap` |
| `ar-ap/components/PaymentReceiptForm.tsx` | `handleDocSelected`, `handlePrepSelected`, `getEffectiveMax`, `handleAmountChange` |
