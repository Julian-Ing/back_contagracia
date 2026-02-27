# Módulo de Certificado Digital — electronic-documents-service

**Fecha:** 2026-02-17

## Resumen

Módulo para gestionar el certificado digital (.p12/.pfx) necesario para firmar documentos electrónicos ante la DIAN.

## Flujo

1. Usuario sube archivo .p12 + contraseña
2. Se guarda archivo en disco (`uploads/certificates/{nit}/`)
3. Se convierte a base64 (helper) y se envía al API DIAN (`PUT /api/ubl2.1/config/certificate`)
4. Se actualizan en tenant `CompanySetting`: `certificate_path`, `certificate_password`, `certificate_expires_at`

## Endpoints

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| POST | `/certificate/upload` | `electronic_documents.certificate.load` | Subir certificado .p12 |
| GET | `/certificate/info` | `electronic_documents.view` | Info del certificado (sin password) |

## CompanySetting (tenant, category: 'dian') — Seeder

Todas las filas son creadas por el seeder (`prisma/seeds/companySettings.ts`). Los servicios solo hacen `update`.

| key | value_type | default | Descripción |
|-----|-----------|---------|-------------|
| `api_dian_token` | string | '' | Token de autenticación API DIAN (readonly) |
| `certificate_path` | string | '' | Ruta relativa del archivo en disco |
| `certificate_password` | string | '' | Contraseña del certificado |
| `certificate_expires_at` | string | '' | Fecha expiración (readonly) |
| `invoice_software_id` | string | '' | ID software facturación |
| `invoice_software_pin` | number | '' | PIN software facturación (5 dígitos) |
| `invoice_test_set_id` | string | '' | Test Set ID facturación |
| `invoice_dian_environment` | number | '2' | Ambiente facturación (1=producción, 2=pruebas) |
| `payroll_software_id` | string | '' | ID software nómina |
| `payroll_software_pin` | number | '' | PIN software nómina (5 dígitos) |
| `payroll_test_set_id` | string | '' | Test Set ID nómina |
| `payroll_dian_environment` | number | '2' | Ambiente nómina (1=producción, 2=pruebas) |

## Notas
- El base64 **NO se almacena**, solo se usa para enviar al API DIAN
- Patrón de almacenamiento igual al logo (`uploads/logos/` → `uploads/certificates/`)
- Al subir un nuevo certificado, el anterior se elimina del disco automáticamente
- No existe endpoint de eliminar certificado — solo se sube/reemplaza
- El `.js` compilado de `companySettings.ts` debe regenerarse al agregar campos
