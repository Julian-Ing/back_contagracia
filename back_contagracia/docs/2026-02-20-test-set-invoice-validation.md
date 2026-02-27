# Validación Test Set Facturación - Paso a Producción

**Fecha:** 2026-02-20
**Autor:** Claude Code
**Módulo:** electronic-documents-service, contagracia-shared-modules

## Descripción

Flujo automatizado de 5 pasos para habilitar facturación electrónica en producción. El frontend ejecuta los pasos secuencialmente mostrando progreso en tiempo real. Incluye importación automática de resoluciones de producción desde DIAN.

## Endpoints Backend

| Paso | Método | Endpoint | Descripción |
|------|--------|----------|-------------|
| 1 | POST | `/test-set/invoice/register-resolution` | Registrar resolución SETP en DIAN |
| 2 | POST | `/test-set/invoice/send` | Enviar factura de prueba |
| 3 | POST | `/test-set/invoice/status/:zipKey` | Consultar estado ZipKey |
| 4 | POST | `/test-set/invoice/import-resolutions` | Importar resoluciones de producción desde DIAN |
| 5 | PATCH | `/environment/invoice/production` | Cambiar a producción (ya existía) |

### Paso 1 - Registrar resolución SETP

Envía resolución hardcoded de prueba a `PUT /api/ubl2.1/config/resolution`:
```json
{
  "type_document_id": 1,
  "prefix": "SETP",
  "resolution": "18760000001",
  "technical_key": "fc8eac422eba16e22ffd8c6f94b3f40a6e38162c",
  "from": 990000000,
  "to": 995000000,
  "date_from": "2019-01-19",
  "date_to": "2030-01-19"
}
```
No se guarda en DB, solo se registra en API DIAN para habilitación.

### Paso 2 - Enviar factura

- Recibe `{ consecutive: number }` (rango 990000000-995000000)
- Obtiene datos de empresa de Master DB via `getCompanyEstablishmentData()`
- Construye factura con `buildInvoiceTestTemplate()`
- Envía a `POST /api/ubl2.1/invoice/{testSetId}`
- Retorna `{ zipKey }` para consultar estado

### Paso 3 - Consultar estado

- `POST /api/ubl2.1/status/zip/{zipKey}` con body `{ sendmail: false, sendmailtome: false, is_payroll: false, is_eqdoc: false }`
- Frontend hace hasta 10 intentos con 3s de espera (solo si respuesta exitosa sin statusCode definitivo)
- Si el API devuelve error HTTP se detiene de inmediato
- `statusCode "00"` = éxito, `"99"` = error

### Paso 4 - Importar resoluciones de producción

Consulta `POST /api/ubl2.1/numbering-range` con `{ IDSoftware }` (lee `invoice_software_id` de CompanySetting).

**Respuesta DIAN:** `ResponseDian.Envelope.Body.GetNumberingRangeResponse.GetNumberingRangeResult`
- `OperationCode: "100"` = éxito, `"302"` = sin resoluciones
- `ResponseList.NumberRangeResponse[]` con: `Prefix`, `ResolutionNumber`, `ResolutionDate`, `FromNumber`, `ToNumber`, `ValidDateFrom`, `ValidDateTo`, `TechnicalKey`

**Clasificación:**
- Con `TechnicalKey` → `type_document_id = '1'` (Factura)
- Sin `TechnicalKey` → `type_document_id = '11'` (Documento Soporte)

**Para cada resolución:**
1. Busca en DB si ya existe (type_document_id + prefix + resolution_number) → skipea
2. Registra en API DIAN `PUT /api/ubl2.1/config/resolution`
3. Guarda en DB con `last_external_consecutive = from - 1`

**Botón manual:** También disponible como "Imp. Resoluciones" en la tarjeta para empresas que ya tienen habilitación.

### Paso 5 - Producción (existente)

Usa `PATCH /environment/invoice/production` que ya existía.

## Archivos Creados

### Backend - electronic-documents-service
- `src/modules/test-set/test-set.module.ts`
- `src/modules/test-set/test-set.controller.ts`
- `src/modules/test-set/test-set.service.ts`
- `src/app.module.ts` - importado TestSetModule

### Backend - contagracia-shared-modules

**shared-tenant-context/tenant-context.service.ts:**
- Nuevo método `getCompanyEstablishmentData(companyId)` - retorna company_name, address, phone, email, municipality_id de Master DB

**shared-dian/dian-api.service.ts:**
- `sendInvoice(token, testSetId, invoiceData)` - POST factura
- `checkZipStatus(token, zipKey)` - POST estado ZipKey con body sendmail/is_payroll/is_eqdoc
- `getNumberingRange(token, softwareId)` - POST numbering-range, parsea resoluciones

## Resolución SETP

La resolución SETP es fija para todos los test sets de facturación DIAN:
- Prefix: SETP
- Resolution: 18760000001
- Rango: 990,000,000 - 995,000,000
- Vigencia: 2019-01-19 a 2030-01-19
- Solo se registra en API DIAN, no se guarda en DB local
