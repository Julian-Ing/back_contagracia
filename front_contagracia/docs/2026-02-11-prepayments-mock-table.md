# Anticipos: tabla mock con columnas separadas

**Fecha:** 2026-02-11

## Tabla de anticipos

Página `/dashboard/prepayments` con tabla mock de 11 columnas:

| Columna | Descripción |
|---|---|
| Consecutivo | AT-0001, font-mono |
| Fecha | dd mmm yyyy |
| Tipo | Cliente (azul), Proveedor (morado), Empleado (naranja) |
| Tercero | Nombre del tercero |
| Cuenta | Código + nombre de la cuenta del anticipo |
| Banco | Nombre de la cuenta bancaria (o "—") |
| Método | Método de pago (o "—") |
| Cuenta de cruce | Código + nombre de la cuenta contrapartida (o "—") |
| Monto | Monto original en COP |
| Saldo | Saldo restante (gris si $0) |
| Estado | Activo, Aplicado, Devuelto, Anulado |

## Escenarios demostrados

- **Con banco + método + cruce**: AT-0001, AT-0002, AT-0004, AT-0005, AT-0006
- **Solo cuenta de cruce** (sin banco/método): AT-0003
- **Sin nada** (anulado): AT-0007

## Estados

- Activo (verde), Aplicado (gris), Devuelto (ámbar), Anulado (rojo)
