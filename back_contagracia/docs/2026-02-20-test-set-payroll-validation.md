# Validación Test Set Nómina - Paso a Producción

**Fecha:** 2026-02-20
**Autor:** Claude Code
**Módulo:** electronic-documents-service, contagracia-shared-modules

## Descripción

Flujo automatizado de 5 pasos para habilitar nómina electrónica en producción. El frontend envía 10 nóminas y 8 notas de ajuste secuencialmente mostrando progreso granular. Los prefijos de prueba (TNI/TNA) son editables desde el frontend. Al finalizar, crea resoluciones de producción NI/NA y cambia el ambiente.

## Endpoints Backend

| Paso | Método | Endpoint | Descripción |
|------|--------|----------|-------------|
| 1 | POST | `/test-set/payroll/register-resolutions` | Registrar resoluciones de prueba (prefijos editables) |
| 2 | POST | `/test-set/payroll/send` | Enviar una nómina de prueba |
| 3 | POST | `/test-set/payroll/send-adjust-note` | Enviar una nota de ajuste |
| 4 | POST | `/test-set/payroll/create-production-resolutions` | Crear resoluciones NI y NA de producción |
| 5 | PATCH | `/environment/payroll/production` | Cambiar a producción (ya existía) |

### Paso 1 - Registrar resoluciones de prueba

Recibe prefijos desde el frontend (default TNI/TNA, editables). Envía 2 resoluciones a `PUT /api/ubl2.1/config/resolution`:

**Body:**
```json
{ "payroll_prefix": "TNI", "note_prefix": "TNA" }
```

**Nómina Individual (type_document_id 9):**
```json
{
  "type_document_id": 9, "prefix": "<payroll_prefix>", "resolution": "18760000001",
  "resolution_date": "2025-01-01", "technical_key": "",
  "from": 1, "to": 99999999, "date_from": "2025-01-01", "date_to": "2100-12-31"
}
```

**Nota de Ajuste (type_document_id 10):**
```json
{
  "type_document_id": 10, "prefix": "<note_prefix>", "resolution": "18760000001",
  "resolution_date": "2025-01-01", "technical_key": "",
  "from": 1, "to": 99999999, "date_from": "2025-01-01", "date_to": "2100-12-31"
}
```

No se guardan en DB, solo se registran en API DIAN para habilitación.

### Paso 2 - Enviar 10 nóminas

- Frontend llama 10 veces con `{ consecutive: N }`
- Usa `buildPayrollTestTemplate()` (SIN establishment fields)
- Envía a `POST /api/ubl2.1/payroll/{testSetId}`
- Éxito: `message.includes("generada con éxito")` + `nilAttr === "true"`
- Retorna `{ cune, consecutive, issueDate }` - se guardan para paso 3

### Paso 3 - Enviar 8 notas de ajuste

- Frontend llama 8 veces con `{ consecutive, predecessor_number, predecessor_cune, predecessor_issue_date }`
- Usa `buildPayrollAdjustNoteTemplate()` (CON establishment fields de Master DB)
- Envía a `POST /api/ubl2.1/payroll-adjust-note/{testSetId}`
- Nota 1 anula nómina 1, nota 2 anula nómina 2, ... nota 8 anula nómina 8
- Nóminas 9 y 10 quedan sin anular (requisito DIAN)

### Paso 4 - Crear resoluciones NI y NA de producción

Crea las resoluciones de producción (prefijos fijos NI y NA, diferentes de los de prueba TNI/TNA):

**Para cada resolución (NI type_document_id 9, NA type_document_id 10):**
1. Busca en DB si ya existe (por `type_document_id` + `prefix` + `resolution_number`)
2. Si existe → la skipea (no error)
3. Si no existe → envía a API DIAN `PUT /api/ubl2.1/config/resolution` y guarda en tabla `resolutions`

```json
{
  "type_document_id": 9, "prefix": "NI", "resolution": "18760000001",
  "resolution_date": "2000-01-01", "technical_key": "",
  "from": 1, "to": 99999999, "date_from": "2000-01-01", "date_to": "2100-12-31"
}
```

**Datos guardados en DB:**
- `last_external_consecutive`: 0
- `is_active`: true
- `range_from`: 1, `range_to`: 99999999

### Paso 5 - Producción (existente)

Usa `PATCH /environment/payroll/production` que ya existía.

## DianApiService - Métodos Usados

- `syncResolution(token, data)` - PUT resolución en DIAN (pasos 1 y 4)
- `sendPayroll(token, testSetId, payrollData)` - POST nómina, retorna CUNE directo (sin ZipKey/polling)
- `sendPayrollAdjustNote(token, testSetId, noteData)` - POST nota de ajuste, retorna CUNE directo

**Logging centralizado:** Todas las llamadas logean `📤 request` y `📥 response` automáticamente desde `makeRequest`.

## ApiLog - Registro en DB

Cada envío de documento (factura, nómina, nota de ajuste) se guarda en tabla `apilog` del tenant.

- `saveApiLog(tenantDb, referenceType, request, response, success)` en `DianApiService`
- **Request**: se guarda completo (el template JSON)
- **Response**: se filtran campos grandes (XMLs base64) con `filterLargeFields()`:
  - Factura: `invoicexml`, `reqfe`, `unsignedinvoicexml`, `zipinvoicexml`, `rptafe`
  - Nómina: `payrollxml`, `reqni`, `unsignedpayrollxml`, `zippayrollxml`, `rptani`
  - Nota ajuste: equivalentes con sufijos `na`
- Campos útiles que SÍ se guardan: `message`, `cufe`/`cune`, `QRStr`, `ResponseDian`, URLs, `certificate_days_left`
- `reference_type` usa enum `ApiLogReferenceType`: `INVOICE_HABILITATION`, `PAYROLL_HABILITATION`, `PAYROLL_ADJUST_NOTE_HABILITATION`

## Diferencia con Facturación

| Aspecto | Facturación | Nómina |
|---------|-------------|--------|
| Respuesta | ZipKey → polling estado | CUNE directo |
| Cantidad docs | 1 factura | 10 nóminas + 8 notas |
| Establishment | Sí | Solo en notas de ajuste |
| Resolución prueba | SETP (1 sola) | TNI + TNA (2) |

## Archivos Modificados

### Backend - contagracia-shared-modules
- `shared-dian/src/dian-api.service.ts` - sendPayroll(), sendPayrollAdjustNote(), saveApiLog(), filterLargeFields()

### Backend - electronic-documents-service
- `src/modules/test-set/test-set.service.ts` - 4 métodos nómina + saveApiLog en cada envío
- `src/modules/test-set/test-set.controller.ts` - 4 endpoints nómina
