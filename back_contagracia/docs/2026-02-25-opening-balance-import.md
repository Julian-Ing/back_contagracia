# Importación de Saldos Iniciales desde Excel

**Fecha:** 2026-02-25

## Contexto

Las empresas nuevas necesitan cargar saldos iniciales (balance general, CxC, CxP, anticipos) al primer periodo anual. Antes solo se generaban automáticamente al cerrar un periodo anterior.

## Schema

### `AccountingPeriodAction`
- Nuevo campo: `is_manual Boolean @default(false)` — distingue importaciones manuales de acciones automáticas

## Endpoints nuevos

### `GET /accounting-periods/:id/opening-balance-template`
Descarga plantilla Excel con:
- **Hoja "Saldos"**: Cuenta, Débito, Crédito, Descripción, Tercero, Banco, CC, Tipo CC
- **Hoja "CxC"**: NIT Tercero, Referencia, Monto, Fecha Vencimiento, Cuenta CxC, CC, Tipo CC
- **Hoja "CxP"**: NIT Tercero, Referencia, Monto, Fecha Vencimiento, Cuenta CxP, CC, Tipo CC
- **Hoja "Anticipos"**: NIT Tercero, Tipo (Cliente/Proveedor/Empleado), Monto, Cuenta, CC, Tipo CC
- **Hojas ocultas** con data validation (dropdowns): _cuentas, _terceros, _bancos, _cc, _tipocc

### `POST /accounting-periods/:id/import-opening-balance`
Multipart: `file` (Excel) + `description` (string opcional).

Flujo:
1. Valida periodo (anual, abierto, sin importación activa)
2. Parsea las 4 hojas del Excel
3. Valida: cuentas existen, terceros existen (por NIT), bancos existen, CCs existen, balance cuadra
4. Crea JE tipo `opening_balance` via `JournalEntriesService.create()`:
   - Saldos → items NORMAL
   - CxC → CXC_CREATED (DEBIT)
   - CxP → CXP_CREATED (CREDIT)
   - Anticipos → PREP_CREATED_CLIENT (CREDIT) / PREP_CREATED_SUPPLIER (DEBIT) / PREP_CREATED_EMPLOYEE (DEBIT)
5. Actualiza due_date individual de cada ArAp
6. Crea `AccountingPeriodAction` con `action=OPEN`, `is_manual=true`

Retorna: `{ journal_entry_id, consecutive, items_count, cxc_count, cxp_count, prepayments_count }`

### `POST /accounting-periods/:id/actions/:actionId/reverse-opening-balance`
1. Valida acción (`is_manual=true`, `action=OPEN`, JE no reversado)
2. Llama `JournalEntriesService.reverseComplete()` — reversa JE + void PaymentReceipt (pagos, ArAps, Prepayments, bancos)

## Cambio en endpoint existente

### `GET /accounting-periods/:id/actions`
Ahora retorna `is_manual` y `journal_entry_is_reversed` en cada acción.

## Archivos nuevos

- `accounting-service/src/modules/periods/opening-balance-template.service.ts`
- `accounting-service/src/modules/periods/opening-balance-import.service.ts`

## Archivos modificados

- `contagracia-shared-modules/prisma/schema-tenant.prisma` — `is_manual` en AccountingPeriodAction
- `accounting-service/package.json` — exceljs, @types/multer
- `accounting-service/src/modules/periods/periods.module.ts` — imports JournalEntriesModule, registra nuevos services
- `accounting-service/src/modules/periods/periods.controller.ts` — 3 endpoints nuevos
- `accounting-service/src/modules/periods/periods.service.ts` — findActions retorna is_manual y journal_entry_is_reversed

## Dependencias

- `exceljs ^4.4.0` — generación y parseo de Excel
- `@types/multer ^2.0.0` — tipos para file upload
