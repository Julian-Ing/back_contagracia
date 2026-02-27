# Contagracia ERP - Frontend

Aplicacion frontend de Contagracia ERP construida con Next.js, shadcn/ui y Zustand.

## Setup

```bash
pnpm install
pnpm dev
```

## Arquitectura Transaccional del Backend

El backend contable usa **transacciones atomicas**. Esto significa que cada operacion del API (crear asiento, cerrar periodo, crear anticipo, etc.) es todo-o-nada: si algo falla, no queda data parcial.

### Implicaciones para el frontend

1. **Un solo error por operacion**: Si el backend rechaza una operacion, el frontend puede mostrar el error con confianza de que NO se creo data parcial. No es necesario implementar rollbacks manuales ni limpieza de data huerfana.

2. **Reintentos seguros**: Si una peticion falla por timeout o red, el usuario puede reintentar sin riesgo de duplicar datos (el backend usa locks `FOR UPDATE` y consecutivos atomicos).

3. **Errores descriptivos**: El backend valida dentro de la transaccion y lanza `BadRequestException` con mensajes en espanol que el frontend puede mostrar directamente al usuario.

### Servicios del backend que son transaccionales

| Endpoint | Operaciones atomicas |
|----------|---------------------|
| `POST /journal-entries` | CxC/CxP + asiento + movimientos bancarios + recibo de pago |
| `POST /journal-entries/:id/reverse` | Reversion de asiento |
| `POST /journal-entries/:id/reverse-complete` | Reversion completa (asiento + recibo + bancos) |
| `POST /journal-entries/:id/duplicate` | Duplicado de asiento + movimientos bancarios |
| `POST /prepayments` | Anticipo + movimiento bancario + asiento contable |
| `POST /prepayments/:id/void` | Reversion asiento + movimiento bancario + anulacion |
| `POST /prepayments/:id/refund` | Asiento de reembolso + movimiento bancario |
| `POST /periods/:id/close` | Asiento de cierre + periodo siguiente + asiento de apertura |
| `POST /periods/:id/reopen` | Reversion de cierre + reversion de apertura + ajustes |
| `POST /bank-accounts` | Cuenta bancaria + saldo inicial (asiento + movimiento) |
| `POST /bank-movements` | Movimiento bancario con lock de saldo |

### Manejo de errores recomendado

```typescript
try {
  const result = await journalEntriesService.create(data);
  toast.success('Asiento creado exitosamente');
} catch (error) {
  // El backend ya hizo rollback, solo mostrar el error
  const message = error.response?.data?.message || 'Error al crear asiento';
  toast.error(message);
  // NO es necesario limpiar data parcial
}
```

## Datos Dinamicos - No Hardcodear

**El frontend NUNCA debe hardcodear labels, nombres o descripciones que existan en la base de datos.** Siempre deben venir del backend.

### Que viene del backend

| Dato | Campo del backend | Fallback en frontend |
|------|-------------------|---------------------|
| Metodo de pago | `payment_method_name` (via `Payment → PaymentReceiptLine → CompanyPaymentMethod.name`) | `"Asiento Manual"` si es `null` |
| Tipo de documento / Fuente | `source_description` (via `ArAp → ArApSource.description`) | `"Asiento Manual"` si es `null` |
| Opciones de filtro por fuente | `sources[]` en respuesta de movimientos de anticipos | Poblar dropdown desde backend |

### Que SI es aceptable hardcodear

- **Prefijos de cuenta PUC** (`1105`, `1110`): regla del Plan Unico de Cuentas colombiano
- **Labels de enums del schema** (estados, tipos de anticipo): valores fijos del schema Prisma
- **Colores y estilos de badges**: decision de UI
- **Opciones de filtro de vencimiento** (0-30, 31-60, 60+ dias): rangos de UI

### Archivos afectados

| Archivo | Cambio |
|---------|--------|
| `BalanceDetailModal.tsx` | Usa `source_description` y `payment_method_name` del backend, removido `taxLabel()` y `getPaymentTypeLabel()` |
| `accounts-receivable/page.tsx` | Usa `source_description` en vez de `payment_type` hardcodeado |
| `accounts-payable/page.tsx` | Usa `source_description` en vez de `payment_type` hardcodeado |
| `PrepaymentDetailModal.tsx` | Dropdown de fuentes viene de `sources[]` del backend, removido `SOURCE_OPTIONS` hardcodeado |
| `modules/ar-ap/types.ts` | Agregado `source_description` a `ArApPayment`, `sources` a `PrepaymentMovementsResponse` |

## Estructura del proyecto

```
src/
  app/dashboard/         # Paginas por modulo
    accounting/          # Contabilidad (asientos, periodos, CxC/CxP, anticipos)
    treasury/            # Tesoreria (bancos, movimientos, conciliacion)
  modules/               # Logica de negocio por modulo
    journal-entries/     # Servicios y tipos de asientos
    ar-ap/               # Servicios y tipos de CxC/CxP
    prepayments/         # Servicios y tipos de anticipos
    bank-accounts/       # Servicios y tipos de bancos
  shared/                # Componentes y utilidades compartidas
    components/ui/       # shadcn/ui components
    services/            # Servicios base (auth, API client)
```
