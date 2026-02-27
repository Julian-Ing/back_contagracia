# Templates para Test Set DIAN - Paso a Producción

**Fecha:** 2026-02-20
**Autor:** Claude Code
**Módulo:** electronic-documents-service

## Descripción

Templates TypeScript para generar los JSON de prueba que se envían a la API DIAN durante el proceso de habilitación (paso a producción) de facturación electrónica y nómina electrónica.

## Archivos Creados

### `electronic-documents-service/src/templates/`

| Archivo | Tipo | Endpoint API DIAN | Cantidad |
|---------|------|-------------------|----------|
| `invoice-test.template.ts` | Factura de prueba | `POST /api/ubl2.1/invoice/{testSetId}` | 1 |
| `payroll-test.template.ts` | Nómina de prueba | `POST /api/ubl2.1/payroll/{testSetId}` | 10 |
| `payroll-adjust-note.template.ts` | Nota de ajuste (anulación) | `POST /api/ubl2.1/payroll-adjust-note/{testSetId}` | 8 |

## Datos Dinámicos vs Hardcoded

### invoice-test.template.ts

**Dinámicos (params):**
- `establishment_name` → `companies.company_name` (Master DB)
- `establishment_address` → `companies.address` (Master DB)
- `establishment_phone` → `companies.phone` (Master DB)
- `establishment_municipality` → `companies.municipality_id` (Master DB)
- `establishment_email` → `companies.email` (Master DB)
- `prefix` → `Resolution.prefix` (Tenant DB)
- `resolutionNumber` → `Resolution.resolution_number` (Tenant DB)
- `nextConsecutive` → `Resolution.last_external_consecutive + 1` (Tenant DB)
- `currentDate`, `currentTime` → Generados (America/Bogota)

**Hardcoded (prueba DIAN):**
- Cliente: justo fidel soto m (NIT 675382-5)
- Producto: empanada $12,000 + IVA 50% = $18,000
- Pago: Contado / Efectivo

### payroll-test.template.ts

**Dinámicos (params):**
- `consecutive` → 1 a 10
- `prefix` → "TNI" (prueba) / "NI" (producción)
- `currentDate` → Generado (America/Bogota)

**NO incluye establishment fields** (solo van en notas de ajuste)

**Hardcoded (prueba DIAN):**
- Trabajador: CRISTIAN LEANDRO SAENZ SALAS (CC 1117488256)
- Salario: $1,423,500
- Devengados: $2,596,494.25
- Deducciones: $1,654,810.00

### payroll-adjust-note.template.ts

**Dinámicos (params):**
- `establishment_*` → Mismos campos de Master DB (igual que factura)
- `consecutive` → 1 a 8
- `prefix` → "TNA" (prueba) / "NA" (producción)
- `currentDate` → Generado (America/Bogota)
- `predecessor_number` → Ej: "TNI1" (de nómina previa)
- `predecessor_cune` → CUNE retornado por DIAN
- `predecessor_issue_date` → Fecha de la nómina original

**Hardcoded:**
- type_note: 2 (anulación)
- Periodo: mismo que nómina original

## Flujo Completo

### Facturación (4 pasos)
1. Enviar 1 factura de prueba → Obtener ZipKey
2. Consultar estado con ZipKey hasta aprobación
3. Cambiar ambiente a producción
4. Consultar resoluciones de producción

### Nómina (4 pasos)
1. Registrar resoluciones de prueba TNI/TNA
2. Enviar 10 nóminas → Guardar 10 CUNEs
3. Enviar 8 notas de ajuste → Referenciar 8 CUNEs
4. Crear resoluciones de producción NI/NA

## Campos establishment

| Template | Incluye establishment? |
|----------|----------------------|
| invoice-test | SI |
| payroll-test | NO |
| payroll-adjust-note | SI |
