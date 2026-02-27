# Datos Dinamicos - No Hardcodear en Frontend

## Regla

**El frontend NUNCA debe hardcodear labels, nombres o descripciones que existan en la base de datos.** Siempre deben venir del backend.

## Datos que vienen del backend

### 1. Metodo de Pago (`CompanyPaymentMethod.name`)

El metodo de pago se obtiene via la cadena:

```
Payment → PaymentReceiptLine → CompanyPaymentMethod → name
```

**Endpoint:** `GET /ar-ap/third-party/:id/detail`

El campo `payment_method_name` en cada pago devuelve:
- `"Nequi"`, `"Daviplata"`, `"Transferencia Bancolombia"`, etc. → nombre configurado por la empresa
- `null` → el pago fue creado por asiento manual (no tiene recibo de caja)

**En el frontend:** Si `payment_method_name` es null, mostrar `"Asiento Manual"`.

### 2. Tipo de Documento / Fuente (`ArApSource.description`)

La tabla `ar_ap_sources` contiene las fuentes de documentos CxC/CxP:

| key | description |
|-----|-------------|
| `invoice` | Factura de Venta |
| `purchase` | Compra |
| `expense` | Gasto |
| `invoice_credit_note` | Nota Credito de Venta |
| `purchase_devolution` | Devolucion de Compra |
| `manual` | Asiento Manual |
| ... | ... |

**Endpoint:** `GET /ar-ap/third-party/:id/detail`

El campo `source_description` en cada pago devuelve la descripcion de la fuente del documento ArAp asociado al pago.

**Endpoint:** `GET /prepayments/:id/movements`

El campo `applied_source.description` en cada movimiento devuelve la descripcion.
El campo `sources[]` devuelve todas las fuentes disponibles para el filtro dropdown.

### 3. Impuestos

Los tipos de impuestos (IVA, INC, ReteIVA, Retefuente, ReteICA) vendran de `ar_ap_sources` cuando se implementen. **NO hardcodear labels de impuestos.**

## Que SI es aceptable hardcodear

- **Prefijos de cuenta PUC** (`1105`, `1110`): Son regla del Plan Unico de Cuentas colombiano, no cambian por empresa
- **Labels de enums del schema** (estados, tipos de anticipo, tipos de referencia): Son valores fijos del schema Prisma con labels de UI
- **Colores y estilos de badges**: Son decision de UI, no datos
- **Opciones de filtro de vencimiento** (0-30, 31-60, 60+ dias): Son rangos de UI

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `ar-ap.service.ts` | Pagos incluyen `source_description` via join `Payment → ArAp → ArApSource` |
| `ar-ap.service.ts` | Pagos incluyen `payment_method_name` via join `Payment → PaymentReceiptLine → CompanyPaymentMethod` |
| `prepayments.service.ts` | Movimientos devuelven `sources[]` con todas las fuentes de `ar_ap_sources` |
