# Cambio de servicio para archivos estáticos (uploads)

**Fecha:** 2026-02-17

## Problema

Los archivos de uploads (logos de empresa, firmas, etc.) se servían desde admin-service (puerto 3002), pero deberían servirse desde company-service (puerto 3003) ya que son recursos relacionados con empresas.

## Solución

### Frontend - Cambio en configuración de URLs

**Archivo:** `src/config/api.config.ts`

**Antes:**
```typescript
export const ADMIN_BASE_URL =
  (process.env.NEXT_PUBLIC_ADMIN_SERVICE_URL || 'http://localhost:3002/api').replace(/\/api$/, '');

export function getUploadUrl(relativePath: string): string {
  if (!relativePath) return '';
  if (relativePath.startsWith('http')) return relativePath;
  return `${ADMIN_BASE_URL}${relativePath}`; // ← Usaba admin-service (3002)
}
```

**Después:**
```typescript
export const COMPANY_BASE_URL =
  (process.env.NEXT_PUBLIC_COMPANY_SERVICE_URL || 'http://localhost:3003/api').replace(/\/api$/, '');

export function getUploadUrl(relativePath: string): string {
  if (!relativePath) return '';
  if (relativePath.startsWith('http')) return relativePath;
  return `${COMPANY_BASE_URL}${relativePath}`; // ← Ahora usa company-service (3003)
}
```

### Backend - Company-service sirve archivos estáticos

Ver documentación en: `back_contagracia/docs/2026-02-17-separacion-endpoints-company.md`

### Actualización de authStore después de cambios

**Archivo:** `src/app/dashboard/company-profile/page.tsx`

Cuando se actualiza información de la empresa (especialmente el NIT), se refresca la información desde el backend y se actualiza el authStore para que el Header refleje los cambios:

```typescript
// Después de updateCompanyInfo
const updatedCompany = await companyService.getCompany(authCompany.id);
setCompany(updatedCompany as unknown as CompanyData);

// Actualizar authStore para que el Header refleje los cambios
const authState = useAuthStore.getState();
if (authState.company) {
  authState.setCompany({
    ...authState.company,
    nit: updatedCompany.nit,
    company_name: updatedCompany.company_name,
    logo_url: updatedCompany.logo_url, // ← Logo actualizado con nuevo NIT
  });
}
```

## Resultado

- ✅ Todos los uploads se sirven desde company-service (puerto 3003)
- ✅ Logos de empresa accesibles en `http://localhost:3003/uploads/logos/...`
- ✅ Mejor organización: recursos de empresas en company-service
- ✅ Logo actualizado en Header después de cambiar NIT
