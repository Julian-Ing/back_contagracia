# Correccion de Timezone en Fechas - 2026-02-09

## Problema

Al reabrir un periodo cerrado en 2026, el sistema fallaba con:
```
"El período contable \"Año 2026\" está cerrado"
```

Esto ocurria porque la fecha de apertura se creaba incorrectamente.

## Causa Raiz

### Problema 1: Creacion de fechas con string ISO

```typescript
// INCORRECTO - Crea fecha en UTC
new Date('2027-01-01')
// En Colombia (UTC-5): 2026-12-31 19:00:00
```

JavaScript interpreta strings ISO como UTC, lo que en zonas horarias negativas (como Colombia UTC-5) resulta en el dia anterior.

### Problema 2: Comparacion de fechas con hora local

```typescript
// INCORRECTO - Usa hora local
operationDate.setHours(0, 0, 0, 0);
```

Esto creaba inconsistencias al comparar con fechas almacenadas en UTC.

## Solucion

### 1. validate-period-open.ts

Cambio de `setHours` a `setUTCHours` para comparacion consistente:

```typescript
export async function validatePeriodOpen(tenantDb: any, date: Date): Promise<void> {
  const operationDate = new Date(date);

  // ANTES (incorrecto):
  // operationDate.setHours(0, 0, 0, 0);

  // AHORA (correcto):
  operationDate.setUTCHours(0, 0, 0, 0);

  // ... resto de validacion
}
```

Lo mismo en `isPeriodOpen()`:

```typescript
export async function isPeriodOpen(tenantDb: any, date: Date): Promise<{...}> {
  const operationDate = new Date(date);
  operationDate.setUTCHours(0, 0, 0, 0);  // UTC consistente
  // ...
}
```

### 2. periods.service.ts - Metodo close()

Cambio en creacion de fecha para asiento de apertura:

```typescript
// ANTES (incorrecto):
date: new Date(`${nextYear}-01-01`)  // UTC = dia anterior en Colombia

// AHORA (correcto):
date: new Date(nextYear, 0, 1)  // Fecha local correcta
```

El constructor `new Date(year, month, day)` crea la fecha en timezone local, evitando el problema de UTC.

### 3. periods.service.ts - Creacion de periodo siguiente

```typescript
// ANTES (incorrecto):
start_date: new Date(`${nextYear}-01-01`),
end_date: new Date(`${nextYear}-12-31`),

// AHORA (correcto):
start_date: new Date(`${nextYear}-01-01`),  // OK para fechas de periodo
end_date: new Date(`${nextYear}-12-31`),    // OK para fechas de periodo
```

**Nota:** Para las fechas de inicio/fin de periodo, el string ISO funciona porque se almacenan como DATE (sin hora) en la base de datos.

## Regla General

| Caso de Uso | Metodo Correcto |
|-------------|-----------------|
| Fecha para transaccion/asiento | `new Date(year, month, day)` |
| Fecha para comparacion | `date.setUTCHours(0, 0, 0, 0)` |
| Fecha solo para almacenar (DATE) | `new Date('YYYY-MM-DD')` es OK |

## Ejemplo

```typescript
// Crear fecha de transaccion para 1 de enero 2027
const transactionDate = new Date(2027, 0, 1);  // Enero = 0

// Comparar fechas de forma consistente
const dateToCompare = new Date(someDate);
dateToCompare.setUTCHours(0, 0, 0, 0);
```

## Archivos Modificados

- `accounting-service/src/functions/validate-period-open.ts`
- `accounting-service/src/modules/periods/periods.service.ts`
