# FormattedNumber — Guia de uso

Componente display para mostrar valores numericos formateados (moneda, numeros, porcentajes).
Lee automaticamente los **decimales configurados** del tenant via `CompanySettingsProvider`.

---

## Imports

```tsx
// Componente React (para JSX)
import { FormattedNumber } from '@/shared/components/ui/formatted-number';

// Hook (para toasts, strings, titulos — lee decimales del contexto)
import { useFormatNumber } from '@/shared/components/ui/formatted-number';

// Funciones puras (para tooltips de charts, exports — requieren decimales manuales)
import { formatCurrencyCO, formatNumberCO, formatPercentCO } from '@/shared/utils/formatNumber';
```

---

## Componente `<FormattedNumber />`

### Props

| Prop | Tipo | Default | Descripcion |
|------|------|---------|-------------|
| `value` | `number` | *requerido* | Valor numerico a formatear |
| `type` | `'currency' \| 'number' \| 'percent'` | `'number'` | Tipo de formato |
| `decimals` | `number` | del contexto | Override manual (ignora config del tenant) |
| `className` | `string` | — | Clases CSS / Tailwind |
| `...props` | `HTMLSpanElement` | — | Cualquier atributo de `<span>` (title, onClick, etc.) |

### Ejemplos basicos

```tsx
// Moneda COP — usa decimales del tenant automaticamente
<FormattedNumber value={1500000} type="currency" />
// Si tenant tiene 0 decimales → $ 1.500.000
// Si tenant tiene 2 decimales → $ 1.500.000,00

// Numero plano
<FormattedNumber value={42350} type="number" />
// → 42.350

// Porcentaje (recibe el valor como fraccion: 0.15 = 15%)
<FormattedNumber value={0.1534} type="percent" />
// → 15,34 %

// Override de decimales (ignora config del tenant)
<FormattedNumber value={1234.567} type="number" decimals={3} />
// → 1.234,567
```

### Con estilos (className)

```tsx
// Card de dashboard — valor grande verde
<FormattedNumber
  value={data.total_sales}
  type="currency"
  className="text-2xl font-bold text-green-600"
/>

// Celda de tabla — texto derecha
<FormattedNumber
  value={item.balance}
  type="currency"
  className="text-right font-medium text-orange-600"
/>

// Badge pequeno
<FormattedNumber
  value={0.12}
  type="percent"
  className="text-xs text-gray-500"
/>

// Tabular nums (para alinear numeros en columnas)
<FormattedNumber
  value={item.amount}
  type="currency"
  className="tabular-nums"
/>
```

### Dentro de una Card

```tsx
<Card>
  <CardHeader>
    <CardTitle className="text-sm text-gray-500">Ventas Totales</CardTitle>
  </CardHeader>
  <CardContent>
    <FormattedNumber
      value={data.total_sales}
      type="currency"
      className="text-2xl font-bold text-green-600"
    />
  </CardContent>
</Card>
```

### Dentro de una tabla

```tsx
<TableCell className="text-right">
  <FormattedNumber value={row.amount} type="currency" className="font-medium" />
</TableCell>
```

### Condicional (valor positivo/negativo)

```tsx
<FormattedNumber
  value={balance}
  type="currency"
  className={balance >= 0 ? 'text-green-600' : 'text-red-600'}
/>
```

---

## Hook `useFormatNumber()`

Para usar en toasts, strings, titulos, o cualquier lugar donde no cabe un componente React.
Lee `displayDecimals` del contexto del tenant automaticamente.

```tsx
import { useFormatNumber } from '@/shared/components/ui/formatted-number';

const { fmtCurrency, fmtNumber, fmtPercent } = useFormatNumber();

// Toasts
toast.success(`Pago aplicado: ${fmtCurrency(15000)}`);

// Strings interpoladas
const title = `Total: ${fmtCurrency(amount)}`;

// Override manual de decimales
const { fmtCurrency: fmt4 } = useFormatNumber(4);
```

---

## Funciones puras (sin React)

Para usar fuera de componentes React (tooltips de charts, exports a CSV, etc.).
**No tienen acceso al contexto** — requieren pasar decimales manualmente.

```tsx
import { formatCurrencyCO, formatNumberCO, formatPercentCO } from '@/shared/utils/formatNumber';

formatCurrencyCO(1500000, 2)   // → "$ 1.500.000,00"
formatNumberCO(42350, 0)       // → "42.350"
formatPercentCO(0.1534, 2)     // → "15,34 %"
```

---

## Migracion desde formatCurrency local

Antes (hardcodeado en cada archivo):

```tsx
// Definicion local repetida en ~19 archivos
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);

// Uso
<div className="text-2xl font-bold text-green-600">{formatCurrency(data.total_sales)}</div>
```

Despues (centralizado + respeta decimales del tenant):

```tsx
import { FormattedNumber } from '@/shared/components/ui/formatted-number';

<FormattedNumber value={data.total_sales} type="currency" className="text-2xl font-bold text-green-600" />
```

---

## Notas

- El componente renderiza un `<span>` — se puede usar inline dentro de `<p>`, `<div>`, `<td>`, etc.
- Si se usa fuera de `CompanySettingsProvider`, el default es **2 decimales**.
- `type="percent"` espera el valor como fraccion (0.15 = 15%), igual que `Intl.NumberFormat`.
- Para **inputs** numericos sigue usando `<NumericInput />` que ya respeta `displayDecimals`.
