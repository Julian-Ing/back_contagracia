# Bank Movements Endpoint

## Fecha: 2026-02-05

## Descripción

Endpoint para consultar movimientos bancarios de una cuenta específica con búsqueda fuzzy y paginación.

## Endpoints

### GET /bank-movements

Lista movimientos de una cuenta bancaria.

**Parámetros Query:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `bank_account_id` | string | Sí | ID de la cuenta bancaria |
| `search` | string | No | Búsqueda por consecutivo, descripción o referencia |
| `type_key` | string | No | Filtrar por tipo de movimiento |
| `from_date` | string | No | Fecha desde (YYYY-MM-DD) |
| `to_date` | string | No | Fecha hasta (YYYY-MM-DD) |
| `page` | number | No | Página (default: 1) |
| `limit` | number | No | Límite por página (default: 20) |

**Respuesta:**

```json
{
  "data": [
    {
      "id": "uuid",
      "consecutive": "MB-0001",
      "transaction_date": "2026-02-05",
      "amount": 500000.0000,
      "type_key": "invoice_receivable_payment",
      "type_description": "Cobros de Factura de Venta",
      "description": "Pago factura FV-0123",
      "reference_id": "uuid",
      "reference_type": "journal_entry",
      "reference_consecutive": "JE-0456",
      "created_at": "2026-02-05T10:30:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20,
  "totalPages": 3,
  "hasMore": true
}
```

### GET /bank-movements/:id

Obtiene un movimiento bancario por ID.

**Respuesta:** Movimiento con relaciones a tipo y cuenta bancaria.

## Permisos

| Endpoint | Permiso Requerido |
|----------|-------------------|
| GET /bank-movements | `bank_transactions.view` |
| GET /bank-movements/:id | `bank_transactions.view` |

## Archivos

- `src/modules/bank-movements/bank-movements.module.ts`
- `src/modules/bank-movements/bank-movements.controller.ts`
- `src/modules/bank-movements/bank-movements.service.ts`
- `src/app.module.ts` - Importación del módulo

## Tipos de Movimientos

Los tipos disponibles están en la tabla `bank_movement_types`:

**Ingresos:**
- `invoice_receivable_payment` - Cobros de Factura de Venta
- `client_prepayment` - Anticipo de clientes
- `supplier_prepayment_refund` - Reembolso Anticipo de proveedores

**Egresos:**
- `expense_payable_payment` - Abonos a Gastos
- `purchase_payable_payment` - Abonos a Compras
- `supplier_prepayment` - Anticipo de proveedores
- `payroll` - Pago de Nómina

**Bancarios:**
- `bank_transfer` - Transferencia Bancaria
- `bank_adjustment` - Ajuste Bancario
- `bank_account_opening` - Saldo Inicial Bancario

**Manuales:**
- `manual` - Movimiento Manual
- `reversal` - Reversión
