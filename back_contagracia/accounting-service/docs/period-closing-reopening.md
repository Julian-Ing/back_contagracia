# Cierre y Reapertura de Periodos Contables

## Descripcion

Sistema de cierre y reapertura de periodos contables anuales con generacion automatica de asientos.

## Endpoints

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| POST | `/periods/:id/close` | Cerrar periodo |
| POST | `/periods/:id/reopen` | Reabrir periodo |
| GET | `/periods/:id/closing-preview` | Preview de cierre |

## Cierre de Periodo (POST /:id/close)

### Body

```typescript
{
  closingAccountCode: string;  // Cuenta de utilidad (ej: "360505")
  openingAccountCode: string;  // Cuenta de resultados anteriores (ej: "37050501")
  reason?: string;             // Motivo del cierre
}
```

### Proceso para Periodos Anuales

1. **Valida** que el periodo este abierto
2. **Valida** que las cuentas de cierre y apertura existan
3. **Genera asiento de CIERRE** (`period_close`):
   - Sin fecha (null)
   - Cierra cuentas de clases 4, 5, 6 (ingresos, gastos, costos)
   - Diferencia va a cuenta de utilidad (360505)
4. **Crea/obtiene periodo del siguiente ano**
5. **Genera asiento de APERTURA** (`opening_balance`):
   - Fecha: 1 de enero del siguiente ano
   - Traslada saldos de clases 1, 2, 3, 7, 8, 9
   - Utilidad se traslada a cuenta de resultados anteriores (37050501)
6. **Actualiza estado** del periodo a CLOSED
7. **Registra acciones** en ambos periodos

### Asiento de Cierre (period_close)

```
Sin fecha
---------
DEBIT  4xxxx  (Ingresos - para cerrar saldo acreedor)
CREDIT 5xxxx  (Gastos - para cerrar saldo deudor)
CREDIT 6xxxx  (Costos - para cerrar saldo deudor)
DEBIT  360505 (Utilidad del ejercicio - diferencia)
```

### Asiento de Apertura (opening_balance)

```
Fecha: 2027-01-01
-----------------
DEBIT  1xxxx    (Activos - saldos iniciales)
CREDIT 2xxxx    (Pasivos - saldos iniciales)
CREDIT 3xxxx    (Patrimonio - saldos iniciales excepto 360505)
CREDIT 37050501 (Utilidad trasladada de 360505)
```

## Reapertura de Periodo (POST /:id/reopen)

### Body

```typescript
{
  reason?: string;  // Motivo de reapertura
}
```

### Validaciones

1. El periodo debe estar CLOSED
2. Maximo 2 periodos anuales activos (OPEN o REOPENED)
3. Si hay 1 activo, solo se puede reabrir el ano anterior

### Proceso para Periodos Anuales

1. **Busca acciones** CLOSE y OPEN con asientos asociados
2. **Revierte asiento de cierre** usando `JournalEntriesService.reverse()`:
   - Sin fecha (null)
   - NO crea movimientos bancarios
3. **Revierte asiento de apertura** usando `JournalEntriesService.reverse()`:
   - Con fecha del asiento original
   - NO crea movimientos bancarios
4. **Registra accion ADJUST** en periodo siguiente (con reversion de apertura)
5. **Actualiza estado** a REOPENED
6. **Registra accion REOPEN** (con reversion de cierre)

### Uso de reverse()

El servicio de periodos usa la funcion `reverse()` de `JournalEntriesService`:

```typescript
// Inyeccion con forwardRef para dependencia circular
@Inject(forwardRef(() => JournalEntriesService))
private readonly journalEntriesService: JournalEntriesService

// Reversion de cierre (sin fecha)
const closingReversal = await this.journalEntriesService.reverse(
  companyId,
  closeAction.journal_entry_id,
  null,
);

// Reversion de apertura (con fecha)
const openingReversal = await this.journalEntriesService.reverse(
  companyId,
  openAction.journal_entry_id,
  openingEntry.date,
);
```

### Por que NO se crean movimientos bancarios?

Los asientos de cierre (`period_close`) y apertura (`opening_balance`) no tienen movimientos bancarios porque:

- Son asientos de ajuste contable, no transacciones reales
- Las cuentas 1110* y 1105* pueden tener saldos pero no movimientos de banco
- La funcion `reverse()` del servicio no crea movimientos bancarios
- Solo el controller de journal-entries llama `createBankMovementsForReversal()`

## Acciones de Periodo

| Accion | Descripcion | Asiento Asociado |
|--------|-------------|------------------|
| OPEN | Apertura inicial | opening_balance (si aplica) |
| CLOSE | Cierre | period_close |
| REOPEN | Reapertura | reversal de period_close |
| ADJUST | Ajuste por reapertura | reversal de opening_balance |

## Estados de Periodo

| Estado | Descripcion |
|--------|-------------|
| OPEN | Periodo abierto (creacion inicial) |
| CLOSED | Periodo cerrado |
| REOPENED | Periodo reabierto |

## Restricciones

### Maximo 2 Periodos Activos

Solo puede haber 2 periodos anuales con estado OPEN o REOPENED, y deben ser consecutivos:

- 2025 (OPEN) + 2026 (OPEN) = OK
- 2025 (REOPENED) + 2026 (OPEN) = OK
- 2024 (OPEN) + 2026 (OPEN) = ERROR (no consecutivos)
- 2025 + 2026 + 2027 todos activos = ERROR (maximo 2)

### Orden de Reapertura

Si hay 1 periodo activo (ej: 2027 OPEN), solo se puede reabrir el anterior (2026).

## Manejo de Fechas

### Timezone

Las fechas se crean usando el constructor de Date con componentes locales para evitar problemas de timezone:

```typescript
// CORRECTO - fecha local
new Date(nextYear, 0, 1)  // 1 de enero

// INCORRECTO - puede crear 31 dic por UTC
new Date('2027-01-01')
```

### Comparacion de Fechas

La validacion de periodo abierto usa UTC para comparaciones consistentes:

```typescript
operationDate.setUTCHours(0, 0, 0, 0);
```

## Permisos

| Permiso | Descripcion |
|---------|-------------|
| `accounting.periods.close` | Cerrar periodo |
| `accounting.periods.reopen` | Reabrir periodo |
| `accounting.closing_entries.view` | Ver asientos de cierre |
| `accounting.closing_accounts.configure` | Configurar cuentas de cierre |

## Modulo

### Dependencias

```typescript
// periods.module.ts
@Module({
  imports: [forwardRef(() => JournalEntriesModule)],
  controllers: [PeriodsController],
  providers: [PeriodsService],
  exports: [PeriodsService],
})
export class PeriodsModule {}
```

### Inyeccion

```typescript
// periods.service.ts
@Inject(forwardRef(() => JournalEntriesService))
private readonly journalEntriesService: JournalEntriesService
```
