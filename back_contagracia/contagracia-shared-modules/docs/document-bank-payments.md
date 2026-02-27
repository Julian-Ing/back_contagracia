# Document Bank Payments

## Descripcion

Tabla para registrar pagos de un documento desde multiples cuentas bancarias. Reemplaza el campo `bank_account_id` en `documents` que solo permitia un banco.

## Problema Anterior

El modelo `Document` tenia un campo `bank_account_id` que solo permitia asociar UN banco por documento. En la realidad, un documento puede pagarse con multiples medios (efectivo + transferencia, o dos tarjetas, etc).

## Solucion

Se creo la tabla `document_bank_payments` que permite N pagos por documento:

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | uuid PK | |
| document_id | uuid FK | -> documents.id |
| bank_account_id | uuid FK | -> bank_accounts.id |
| amount | decimal(19,4) | Monto pagado desde esta cuenta |
| created_at | timestamptz | |

## Relaciones

```
document_bank_payments.document_id -> documents.id (onDelete: Cascade)
document_bank_payments.bank_account_id -> bank_accounts.id
```

## Ejemplo de Uso

Factura de $100,000 pagada con:
- Efectivo: $50,000
- Bancolombia: $30,000
- Nequi: $20,000

```json
[
  { "document_id": "xxx", "bank_account_id": "efectivo-id", "amount": 50000 },
  { "document_id": "xxx", "bank_account_id": "bancolombia-id", "amount": 30000 },
  { "document_id": "xxx", "bank_account_id": "nequi-id", "amount": 20000 }
]
```

## Cambios Realizados

1. Eliminado `bank_account_id` de modelo `Document`
2. Creado modelo `DocumentBankPayment`
3. Agregada relacion `bank_payments` en `Document`
4. Agregada relacion `document_bank_payments` en `BankAccount`
