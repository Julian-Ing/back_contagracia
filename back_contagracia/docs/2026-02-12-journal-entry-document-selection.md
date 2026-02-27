# Selección de Documentos en Asientos Manuales

> Documentación del sistema de selección de CxC, CxP y Anticipos al crear asientos contables manuales.

## Resumen

Al crear un asiento manual, cada línea tiene un `reference_type` que determina su comportamiento:

| reference_type | Label | Comportamiento |
|---------------|-------|----------------|
| `NORMAL` | Normal | Línea estándar, sin documento asociado |
| `CXC_CREATED` | Crear CXC | Crea una cuenta por cobrar al guardar |
| `CXP_CREATED` | Crear CXP | Crea una cuenta por pagar al guardar |
| `CXC_PAID` | Cobrar CXC | Requiere seleccionar documento CxC existente |
| `CXP_PAID` | Pagar CXP | Requiere seleccionar documento CxP existente |
| `PREP_USED` | Usar Anticipo | Requiere seleccionar anticipo activo |

## Flujo de Selección

### CXC_PAID / CXP_PAID

1. Usuario selecciona "Cobrar CXC" o "Pagar CXP" como tipo de línea
2. Se abre automáticamente el modal `SelectArApDocumentModal`
3. **Paso 1 — Selección de tercero:**
   - Tabla con todos los terceros con saldo pendiente
   - Columnas: Tercero, Documento, Total CxC/CxP, Recaudado, Saldo Pendiente, Docs (total/pend/pag), Último Doc, Último Pago
   - Filtros: búsqueda fuzzy (debounce 400ms), bucket de vencimiento, fechas de emisión y vencimiento
   - Usa endpoint existente: `GET /ar-ap/summary-by-third-party?type=RECEIVABLE|PAYABLE&tab=pending`
4. **Paso 2 — Selección de documento:**
   - Click en tercero → muestra sus documentos pendientes
   - Columnas: Tipo, Número, Descripción, Fecha, Vencimiento, Días, Monto, Pagado, Saldo, Estado
   - Filtros: búsqueda fuzzy, estado (Pendiente/Parcial/Pagado), vencimiento (Todos/Vencidos/Al día)
   - Usa endpoint existente: `GET /ar-ap/third-party-detail/:id?type=...&statuses=PENDING,PARTIAL`
5. Click en documento → se auto-llenan y bloquean campos de la línea

### PREP_USED

1. Usuario selecciona "Usar Anticipo" como tipo de línea
2. Se abre automáticamente el modal `SelectPrepaymentModal`
3. Tabla con anticipos activos con saldo > 0
4. Columnas: Consecutivo, Tipo, Tercero, Fecha, Monto Original, Saldo Disponible, Notas
5. Filtros: búsqueda fuzzy (debounce 400ms), filtro por tipo (Cliente/Proveedor/Empleado)
6. Usa endpoint existente: `GET /prepayments?status=ACTIVE`
7. Click en anticipo → se auto-llenan y bloquean campos de la línea

## Auto-llenado de Campos

Al seleccionar un documento/anticipo:

| Campo | Valor |
|-------|-------|
| `reference_id` | ID del documento/anticipo |
| `reference_label` | Ej: "Asiento Manual: JE-0016" o "Anticipo AT-001 (Cliente)" |
| `reference_max_amount` | Saldo disponible del documento (para validación) |
| `third_party_id` | Tercero del documento |
| `account_code` | Cuenta contable resuelta (ver sección siguiente) |
| `type` | CXC_PAID → CREDIT, CXP_PAID → DEBIT |
| `is_locked` | `true` — bloquea tercero, cuenta, tipo y ref_type |

## Resolución de Cuenta Contable

### CXC_PAID (Cobrar CxC)
1. `ThirdParty.cxc_account_code` (cuenta CxC específica del tercero)
2. Fallback: `accounting_config['finance_cxc']` (cuenta CxC global)

### CXP_PAID (Pagar CxP)
1. `ThirdParty.cxp_account_code` (cuenta CxP específica del tercero)
2. Fallback: `accounting_config['finance_cxp']` (cuenta CxP global)

### PREP_USED (Usar Anticipo)
1. `Prepayment.account_code` (cuenta del anticipo)
2. Fallback por tipo:
   - CLIENT → `accounting_config['sales_customer_advance']`
   - SUPPLIER → `accounting_config['purchases_supplier_advance']`
   - EMPLOYEE → `accounting_config['accounting_employee_advance']`

## Validaciones

### Frontend (page.tsx)
- Documento requerido si `reference_type` es CXC_PAID, CXP_PAID o PREP_USED
- Monto no puede exceder `reference_max_amount` (usa `Decimal.js`)
- Monto máximo visible debajo del input de monto ("Máx: $X")

### Backend (journal-entries.service.ts)
- `reference_id` requerido para CXC_PAID/CXP_PAID/PREP_USED
- Documento ArAp debe existir y no estar VOIDED ni PAID
- Anticipo debe existir y tener status ACTIVE
- `amount <= balance` del documento
- `third_party_id` debe coincidir con el del documento

## Cambios al Schema (Prisma)

### Payment
- Removido: `company_payment_method_id` (movido a PaymentReceiptLine)
- Agregado: `payment_receipt_line_id String?` con índice

### PaymentReceiptLine
- Agregado: `company_payment_method_id String?` con relación a CompanyPaymentMethod e índice

### CompanyPaymentMethod
- Removido: relación `payments Payment[]`
- Agregado: relación `payment_receipt_lines PaymentReceiptLine[]`

## Archivos Involucrados

### Frontend
| Archivo | Descripción |
|---------|-------------|
| `journal-entries/new/page.tsx` | Formulario principal, integración de modales, validaciones |
| `journal-entries/new/SelectArApDocumentModal.tsx` | Modal de selección de CxC/CxP (2 pasos) |
| `journal-entries/new/SelectPrepaymentModal.tsx` | Modal de selección de anticipos |

### Backend
| Archivo | Descripción |
|---------|-------------|
| `journal-entries/journal-entries.service.ts` | Validación de reference_id en create |
| `ar-ap/ar-ap.service.ts` | Removida referencia a Payment.company_payment_method |
| `payments/payments.service.ts` | DTO actualizado (payment_receipt_line_id) |
| `company-payment-methods/company-payment-methods.service.ts` | Validación de uso en PaymentReceiptLine |
| `prisma/schema-tenant.prisma` | Cambios a Payment, PaymentReceiptLine, CompanyPaymentMethod |

## Pendiente
- Procesamiento real de pagos: al crear asiento con CXC_PAID/CXP_PAID, actualizar ArAp.balance y crear Payment
- Al usar anticipo (PREP_USED), actualizar Prepayment.balance
- Creación de PaymentReceipt asociado
- Movimientos bancarios si aplica
