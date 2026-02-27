# Movimientos Bancarios en Asientos Contables

## Fecha: 2026-02-06

## Descripción

Al crear un asiento contable con líneas que tienen `bank_account_id`, se crean automáticamente los movimientos bancarios correspondientes.

## Reglas de Cuentas Bancarias

| Cuenta Contable | Tipo de Cuenta Bancaria | Requerido |
|-----------------|------------------------|-----------|
| 1110* (Bancos)  | SAVINGS o CHECKING     | Sí        |
| 1105* (Caja)    | CASH                   | Sí        |
| Otras           | No permitido           | -         |

## Lógica de Movimientos

Cuando se crea un asiento con líneas que tienen `bank_account_id`:

- **DEBIT** en cuenta 1110*/1105* → Movimiento **positivo** (ingreso)
- **CREDIT** en cuenta 1110*/1105* → Movimiento **negativo** (egreso)

## Ejemplo

```json
// Asiento: Depósito de cliente
{
  "date": "2026-02-06",
  "type_key": "manual",
  "items": [
    {
      "account_code": "111005",
      "type": "DEBIT",
      "amount": 1000000,
      "bank_account_id": "uuid-banco-principal"
    },
    {
      "account_code": "130505",
      "type": "CREDIT",
      "amount": 1000000,
      "third_party_id": "uuid-cliente"
    }
  ]
}
```

**Resultado:**
- Se crea el asiento contable
- Se crea movimiento bancario: +1,000,000 en "uuid-banco-principal"
- Se actualiza el saldo de la cuenta bancaria

## Referencia del Movimiento

El movimiento bancario creado tiene:
- `reference_id`: ID del asiento contable
- `reference_type`: "journal_entry"
- `reference_consecutive`: Consecutivo del asiento (ej: "MAN-000001")
- `type_key`: Mismo tipo del asiento

## Archivos Modificados

- `src/functions/create-journal-entry.ts` - Llama a createBankMovement después de crear el asiento
