# Logo para impresión (Software propio) - Marca & Formato

## Descripción

Funcionalidad de carga de logo para documentos del sistema (Carta y Tirilla 80 mm).
Este logo NO es el de DIAN — se usa internamente en el software y se muestra en el sidebar del dashboard.

## Endpoints

### `POST /api/companies/:id/logo`
Sube un logo para la empresa.

- **Auth**: JWT requerido
- **Content-Type**: `multipart/form-data`
- **Campo**: `file`
- **Validaciones**:
  - Tipos permitidos: `image/jpeg`, `image/png`, `image/webp`
  - Tamaño máximo: 2 MB
- **Respuesta**:
  ```json
  {
    "url": "/uploads/logos/{NIT}/1234567890-abcdef.jpg",
    "message": "Logo actualizado exitosamente"
  }
  ```

### `DELETE /api/companies/:id/logo`
Elimina el logo de la empresa.

- **Auth**: JWT requerido
- **Respuesta**:
  ```json
  { "message": "Logo eliminado exitosamente" }
  ```

## Almacenamiento

- Los archivos se guardan en `../uploads/logos/{NIT}/` (carpeta por empresa según NIT)
- Al subir un nuevo logo, el anterior se elimina automáticamente del disco
- Admin-service sirve archivos estáticos en `/uploads/*` via `ServeStaticModule`
- URL completa: `http://[ADMIN_HOST]/uploads/logos/{NIT}/filename.jpg`
- El campo `logo_url` en la tabla `companies` (master DB) almacena la ruta relativa

### Estructura de carpetas
```
uploads/logos/
├── 901234567/
│   └── 1739180400-a1b2c3d4.jpg
├── 800123456/
│   └── 1739180500-e5f6g7h8.png
```

## Frontend

- El resize se hace en el browser con Canvas API antes de subir (si excede 800×300 px)
- `getUploadUrl()` de `api.config.ts` convierte rutas relativas a URLs absolutas
- Eliminación de logo requiere confirmación via modal
- Al subir/eliminar, se actualiza el authStore para reflejar el cambio en el Header inmediatamente
- El logo se muestra en:
  - Pestaña "Marca & Formato" de `/dashboard/company-profile`
  - Header/sidebar del dashboard (junto al nombre de la empresa)

## Tab "Marca & Formato"

La pestaña tiene dos secciones:
1. **Subir Logo de la Empresa (DIAN)** — Solo maquetado, otro equipo lo implementará
2. **Logo para impresión (Software propio)** — Funcional: upload, preview, eliminar con confirmación

## Archivos involucrados

### Backend
- `company-service/src/modules/companies/logo.service.ts` — lógica de upload/delete, organización por NIT
- `company-service/src/modules/companies/logo.controller.ts` — endpoints REST (POST/DELETE)
- `company-service/src/modules/companies/companies.module.ts` — registro de LogoController y LogoService
- `auth-service/src/modules/auth/auth.service.ts` — logo_url en respuesta de login y /me
- `auth-service/src/modules/auth/interfaces/auth-response.interface.ts` — logo_url en LoginResponse

### Frontend
- `front_contagracia/src/shared/types/user.types.ts` — interface Company con logo_url
- `front_contagracia/src/app/dashboard/company-profile/page.tsx` — tab Marca & Formato completo
- `front_contagracia/src/shared/components/layout/Header.tsx` — logo en sidebar con fallback a inicial
- `front_contagracia/src/config/api.config.ts` — getUploadUrl() helper (existente, sin cambios)
