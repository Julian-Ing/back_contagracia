# Función createBankMovement

## Fecha: 2026-02-06

## Descripción

Función para crear movimientos bancarios de forma independiente a los asientos contables. Actualiza automáticamente el saldo de la cuenta bancaria.

## Ubicación

`src/functions/create-bank-movement.ts`

## Interfaz

```typescript
interface CreateBankMovementParams {
  bank_account_id: string;
  transaction_date: Date;
  amount: number; // Positivo = ingreso, Negativo = egreso
  type_key: string;
  description?: string;
  reference_id?: string;
  reference_type?: string;
  reference_consecutive?: string;
}

interface CreateBankMovementResult {
  id: string;
  new_balance: number;
}
```

## Uso

```typescript
import { createBankMovement } from '../../functions';

const result = await createBankMovement(tenantContext, companyId, {
  bank_account_id: 'uuid-cuenta',
  transaction_date: new Date(),
  amount: 500000, // Ingreso
  type_key: 'manual',
  description: 'Depósito en efectivo',
  reference_id: 'uuid-documento',
  reference_type: 'payment',
  reference_consecutive: 'PAY-000001',
});

// result.id = ID del movimiento creado
// result.new_balance = Nuevo saldo de la cuenta
```

## Validaciones

1. Cuenta bancaria debe existir y estar activa
2. Tipo de movimiento debe existir en `bank_movement_types`
3. Monto no puede ser cero

## Comportamiento

- `amount > 0`: Ingreso (incrementa saldo)
- `amount < 0`: Egreso (decrementa saldo)
- Crea el movimiento y actualiza saldo en una transacción atómica
- El consecutive lo asigna el sistema automáticamente

## Endpoint

`POST /bank-movements`

**Body:**
```json
{
  "bank_account_id": "uuid",
  "transaction_date": "2026-02-06",
  "amount": 500000,
  "type_key": "manual",
  "description": "opcional",
  "reference_id": "uuid opcional",
  "reference_type": "opcional",
  "reference_consecutive": "opcional"
}
```

**Permiso:** `bank_transactions.create` (FALTA AGREGAR AL SEEDER)

## Arquitectura

Los movimientos bancarios y asientos contables son procesos independientes:

- **createBankMovement**: Siempre se ejecuta si la transacción afecta banco/caja
- **createJournalEntry**: Solo se ejecuta si la empresa tiene módulo de contabilidad

El código que llama (pagos, cobros, etc.) decide qué funciones invocar según los módulos habilitados.
