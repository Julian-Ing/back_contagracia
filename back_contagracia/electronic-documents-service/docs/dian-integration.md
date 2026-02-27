# Integración con API DIAN — electronic-documents-service

## Arquitectura

`electronic-documents-service` expone endpoints REST para configurar la empresa ante la DIAN usando `DianApiService` de `@contagracia/shared-modules`.

## Módulos y responsabilidades

| Módulo | Controller | Servicio | Función |
|--------|-----------|----------|---------|
| `CertificateModule` | `POST /certificate/upload` | Sube certificado .p12 al API DIAN |
| `SoftwareModule` | `PUT /software/invoice`, `PUT /software/payroll` | Configura software de facturación/nómina |
| `EnvironmentModule` | `PUT /environment` | Cambia ambiente (habilitación/producción) |
| `RutModule` | `POST /rut/query` | Consulta RUT en la DIAN |

Cada módulo declara `DianApiService` como provider directo (constructor vacío, sin dependencias NestJS).

## DianApiService

`DianApiService` (de `@contagracia/shared-modules`) NO inyecta `TenantContextService` en el constructor — lo recibe como parámetro en los métodos que lo necesitan. Esto evita circular dependency con módulos globales.

```typescript
// Ejemplo de uso en un servicio
const token = await this.dianApiService.getDianToken(companyId, this.tenantContext);
```

## Flujo: Subir certificado

1. Frontend llama `POST /certificate/upload` con el archivo `.p12` y la contraseña
2. `CertificateService` obtiene el token DIAN de `CompanySetting.dian.api_dian_token`
3. Convierte el archivo a base64
4. Llama `DianApiService.uploadCertificate()` → `PUT /api/ubl2.1/config/certificate`
5. Guarda `certificate_path` y `certificate_password` en `CompanySetting`

## Flujo: Configurar software

1. `POST /software/invoice` → configura software de facturación con `softwareId` + `softwarePin`
2. `POST /software/payroll` → configura software de nómina
3. Ambos usan el token guardado en `CompanySetting.dian.api_dian_token`

## Variables de entorno requeridas

```env
DIAN_API_URL=https://api.contagracia.com   # URL base del API DIAN
DIAN_API_TOKEN_RUT=<token>                  # Token para consultas de RUT (sin autenticación de empresa)
```

## CompanySetting keys (categoría `dian`)

| key | descripción |
|-----|------------|
| `api_dian_token` | Token de autenticación de la empresa ante el API DIAN |
| `certificate_path` | Path del certificado .p12 en disco |
| `certificate_password` | Contraseña del certificado |
| `certificate_expires_at` | Fecha de vencimiento del certificado |
