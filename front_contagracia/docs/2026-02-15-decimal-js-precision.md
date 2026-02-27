# Precisión decimal con decimal.js en formateo y inputs

## Contexto

Los cálculos de redondeo con JS nativo (`toFixed`, `Intl.NumberFormat`) tienen errores de IEEE 754:
- `Number(1.255).toFixed(2)` → `"1.25"` (debería ser `"1.26"`)
- `Number(2.675).toFixed(2)` → `"2.67"` (debería ser `"2.68"`)

En un ERP contable esto es inaceptable. Se migró a `decimal.js` con `ROUND_HALF_UP`.

## Cambios

### shared/utils/formatNumber.ts

Las 3 funciones (`formatCurrencyCO`, `formatNumberCO`, `formatPercentCO`) ahora pre-redondean con `Decimal.toDecimalPlaces(decimals, ROUND_HALF_UP)` antes de pasar el número a `Intl.NumberFormat`. Intl solo se usa para formateo visual (separadores de miles, símbolo $, %).

### shared/components/ui/numeric-input.tsx

1. **displayValue (sin foco)**: Reemplazado `num.toFixed(maxDecimals)` por `new Decimal(num).toDecimalPlaces(maxDecimals, ROUND_HALF_UP)`
2. **useEffect auto-correct**: Nuevo. Si el valor entrante (ej: de DB) tiene más decimales que `maxDecimals`, dispara `onChange` con el valor redondeado. Esto corrige el state real del formulario, no solo el display.

## Comportamiento

| Escenario | Qué pasa |
|-----------|----------|
| Usuario teclea más decimales que config | `handleChange` trunca (slice) — no permite escribir |
| Valor de DB con más decimales que config | `useEffect` redondea con Decimal y dispara onChange — state real se corrige |
| Display sin foco | `displayValue` redondea con Decimal + formatea con Intl |
| FormattedNumber (vistas) | `formatCurrencyCO/formatNumberCO/formatPercentCO` redondean con Decimal |

## Redondeo: ROUND_HALF_UP

- `1.255` con 2 dec → `1.26`
- `1.254` con 2 dec → `1.25`
- `1.5` con 0 dec → `2`
- `-1.255` con 2 dec → `-1.26`

## Archivos

| Archivo | Cambio |
|---------|--------|
| `shared/utils/formatNumber.ts` | Import Decimal, pre-redondeo en 3 funciones |
| `shared/components/ui/numeric-input.tsx` | Import Decimal, displayValue con Decimal, useEffect auto-correct |
