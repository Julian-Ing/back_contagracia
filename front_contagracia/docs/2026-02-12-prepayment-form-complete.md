# Formulario completo de anticipos + componentes reutilizables

**Fecha:** 2026-02-12

## Cambios

### CreatePrepaymentModal
- Formulario completo con todos los campos: Tercero, Tipo, Cuenta de anticipo, Cruce con (toggle Banco/Cuenta), Banco/Caja, Método de pago, Monto, Fecha, Notas
- Botones Guardar (con validación de campos requeridos) y Cancelar
- Monto usa `NumericInput` (es-CO, 2 decimales, sin negativos)
- Fecha usa `DatePicker` (default hoy)
- Banco y Método de pago en grid 2 columnas cuando modo BANK
- Cuenta de cruce cuando modo ACCOUNT
- Todos los campos deshabilitados hasta seleccionar tipo de anticipo

### BankAccountSelect (`shared/components/ui/bank-account-select.tsx`)
- Componente dedicado con API integrada (`GET /bank-accounts`)
- Paginación infinita con scroll, búsqueda debounced
- Props: `filterType` ('bank' | 'cash'), `dropdownPosition` ('top' | 'bottom')
- Muestra cajas como solo nombre, bancos como `banco - nombre`

### PaymentMethodSelect (`shared/components/ui/payment-method-select.tsx`)
- Componente dedicado con API integrada (`GET /company-payment-methods`)
- Botón crear validado con permiso `payment_methods.create`
- Modal de creación usa `PaymentMethodForm` reutilizable
- Paginación infinita, búsqueda debounced, `dropdownPosition`

### PaymentMethodForm (`modules/ar-ap/components/PaymentMethodForm.tsx`)
- Componente reutilizable extraído del formulario inline de la página
- Modos `create` (con selector tipo DIAN) y `edit` (con checkbox activo)
- Props: `mode`, `editing`, `onSuccess`, `onCancel`
- Usado en: PaymentMethodSelect (crear) y payment-methods page (crear/editar)

### payment-methods/page.tsx
- Dialog de crear/editar ahora usa `PaymentMethodForm` en vez de form inline
- Eliminado estado duplicado del formulario

### prepayments.service.ts (frontend)
- Agregado método `create(payload)` que hace `POST /prepayments`
- Agregado tipo `CreatePrepaymentPayload`

### navigation.ts
- Sidebar: "Terceros y Anticipos" → "Terceros"

### Soporte sin módulo de contabilidad
- Si la compañía no tiene módulo `accounting`: se ocultan Cuenta de anticipo y toggle Cruce con
- Sin contabilidad siempre muestra Banco/Caja + Método de pago directamente
- Con contabilidad muestra el toggle para elegir entre Banco o Cuenta contable
- `account_code` ahora nullable en DB y opcional en DTOs

### Validación del formulario
- Botón Guardar siempre habilitado, valida al hacer click con mensajes toast
- Valida: tercero, tipo, cuenta anticipo (si contabilidad), banco/método o cuenta cruce, monto > 0, fecha

### prepayments.service.ts (backend)
- `createPrepayment`: TODO pendiente de implementar lógica de creación
- `account_code` ahora opcional en CreatePrepaymentDto

### schema-tenant.prisma
- `Prepayment.account_code` ahora `String?` (nullable)
- Relación `account` ahora `ChartOfAccount?` (opcional)
