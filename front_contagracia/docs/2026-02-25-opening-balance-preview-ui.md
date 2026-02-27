# Opening Balance: Preview UI con tabs, búsqueda y errores en modal

**Fecha:** 2026-02-25

## Cambios

### 1. Tipos de preview (accountingPeriods.ts)
- `PreviewSaldoRow`: cuenta, nombre, monto, tipo DB/CR, descripción, tercero, banco, CC
- `PreviewCxRow`: tercero, descripción, monto, vencimiento, cuenta, CC
- `PreviewPrepaymentRow`: tercero, tipo (`'customer' | 'supplier' | 'employee'`), monto, cuenta, CC
- `OpeningBalancePreviewResult`: arrays de filas + totales + errores

### 2. Servicio (accountingPeriods.service.ts)
- `previewOpeningBalance(periodId, file)`: POST multipart al endpoint de preview
- `downloadOpeningBalanceTemplate(periodId)`: GET blob
- `importOpeningBalance(periodId, file, description)`: POST multipart
- `reverseOpeningBalance(periodId, actionId)`: POST

### 3. Import dialog con preview (PeriodActionsModal.tsx)
- **Paso 1 (Upload)**: modal 500px con descripción, descarga plantilla, upload archivo, botón "Vista Previa"
- **Paso 2 (Preview)**: modal se agranda a 1200px mostrando:
  - Barra de resumen: Total Débitos y Créditos con `FormattedNumber`
  - Buscador: filtra todas las tabs por cuenta, nombre, tercero, etc.
  - 4 tabs: Saldos (N), CxC (N), CxP (N), Anticipos (N) con conteo
  - Tablas con datos resueltos (nombres, no IDs)
  - Botón "Volver" para regresar al upload, "Confirmar Importación" para importar
- **Errores de validación**: se muestran en el modal como lista roja scrollable, no como toast. Botón de importar deshabilitado cuando hay errores.

### 4. Componente `ImportPreviewContent`
- Componente separado para la vista de preview
- Mapeo de tipos de anticipo a español para UI: `{ customer: 'Cliente', supplier: 'Proveedor', employee: 'Empleado' }`
- Filtrado client-side por búsqueda en todas las tabs

## Archivos modificados
- `src/modules/accounting/types/accountingPeriods.ts`
- `src/modules/accounting/services/accountingPeriods.service.ts`
- `src/modules/accounting/components/PeriodActionsModal.tsx`
