# Fix: formato de monto en descripción de anticipos

**Fecha:** 2026-02-12

## Problema

La descripción del anticipo mostraba el monto sin formato:
`Anticipo AT-0002 a Proveedor Cafam por 100000`

## Solución

Usar `Intl.NumberFormat('es-CO')` sin hardcodear decimales. Formatea con separador de miles (.) y muestra los decimales que envíe el front (configurable 1-4).

**Resultado:** `Anticipo AT-0002 a Proveedor Cafam por 100.000`

Si el front envía `100000.50` → `100.000,5`

## Archivo
- `prepayments.service.ts` → `createPrepayment` → variable `formattedAmount`
