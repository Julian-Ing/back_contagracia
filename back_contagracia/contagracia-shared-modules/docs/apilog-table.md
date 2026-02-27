# Tabla ApiLog

## Fecha: 2026-02-03

## Descripcion

Tabla para registrar todos los envios a APIs externas (DIAN, etc.) con sus request/response.

## Estructura

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | uuid PK | Identificador unico |
| reference_id | uuid | ID del registro relacionado (polimórfico) |
| reference_type | varchar(50) | Tipo de registro: document, third_party, etc. |
| json_request | jsonb | Payload enviado a la API |
| json_response | jsonb | Respuesta recibida de la API |
| status_response | boolean | true = exito, false = error (default false) |
| url_pdf | varchar(255) | URL del PDF generado (si aplica) |
| date_sent | timestamptz | Fecha y hora del envio |
| entity | int | Tipo de entidad API (default 1) |
| created_at | timestamptz | Fecha de creacion |
| updated_at | timestamptz | Fecha de actualizacion |

## Indices

- `reference_id` - Busqueda por registro relacionado
- `reference_type` - Filtrar por tipo de registro
- `date_sent` - Ordenar/filtrar por fecha de envio

## Uso

```typescript
// Registrar envio a DIAN
await prisma.apiLog.create({
  data: {
    reference_id: document.id,
    reference_type: 'document',
    json_request: requestPayload,
    json_response: responseData,
    status_response: response.success,
    url_pdf: response.pdf_url,
    date_sent: new Date(),
  }
});

// Consultar logs de un documento
const logs = await prisma.apiLog.findMany({
  where: {
    reference_id: documentId,
    reference_type: 'document'
  },
  orderBy: { date_sent: 'desc' }
});
```

## Archivos Modificados

- `prisma/schema-tenant.prisma` - Agregado modelo ApiLog
- `C:/projects/py/schema.html` - Agregada tabla en tab Documentos
