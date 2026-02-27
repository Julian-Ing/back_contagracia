# Error Handling: BadRequestException en funciones de accounting-service

**Fecha:** 2026-02-13

## Problema

Todas las funciones en `accounting-service/src/functions/` usaban `throw new Error(...)` para errores de validación. NestJS convierte estos en HTTP 500 (Internal Server Error) y **no envía el mensaje al cliente**. El frontend solo veía "Internal Server Error" en vez del mensaje real (ej: "Las cuentas de clase 7, 8 y 9 solo pueden tener movimientos entre ellas mismas").

## Solución

Reemplazar todos los `throw new Error(...)` por `throw new BadRequestException(...)` de `@nestjs/common`. NestJS envía automáticamente el `message` como HTTP 400 al cliente.

## Archivos modificados

| Archivo | Cambios |
|---------|---------|
| `create-journal-entry.ts` | 16 throw reemplazados |
| `create-ar-ap.ts` | 6 throw reemplazados |
| `create-bank-movement.ts` | 4 throw reemplazados |
| `create-payment.ts` | 4 throw reemplazados |
| `create-prepayment-movement.ts` | 4 throw reemplazados |
| `get-account-balance.ts` | 1 throw reemplazado |
| `get-next-consecutive.ts` | 1 throw reemplazado |
| `reverse-bank-movements.ts` | 1 throw reemplazado |
| `reverse-journal-entry.ts` | 3 throw reemplazados |
| `void-payment-receipt.ts` | 4 throw reemplazados |
| `void-payment.ts` | 3 throw reemplazados |
| `void-prepayment-movement.ts` | 5 throw reemplazados |

**Total: 52 `throw new Error` reemplazados en 12 archivos.**

Cada archivo ahora importa:
```typescript
import { BadRequestException } from '@nestjs/common';
```

## Frontend

El frontend ya capturaba `err.response?.data?.message` en el catch del submit (`page.tsx:494-496`), pero recibía `undefined` porque el 500 no incluye el mensaje. Ahora con 400 recibe el mensaje real y lo muestra en un `toast.error()`.
