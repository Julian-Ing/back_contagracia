# Integración Media Service — Logo, firma y useAuthImage

**Fecha:** 2026-02-24

## Resumen

Se migró la carga de logo y firma del representante legal para usar media-service en lugar de endpoints inexistentes de company-service. Se creó el hook `useAuthImage` para cargar imágenes protegidas con JWT.

## Cambios

### 1. Hook useAuthImage

**Archivo:** `src/shared/hooks/useAuthImage.ts` (nuevo)

Hook que carga imágenes protegidas de media-service usando JWT automáticamente.

```tsx
const { src, loading } = useAuthImage(company?.logo_url);
// src = blob URL para usar en <img src={src} />
```

**Por qué:** Las imágenes con `visibility: 'company'` requieren JWT. Las etiquetas `<img src="...">` no envían headers de Authorization. El hook hace `mediaClient.get(url, { responseType: 'blob' })` que sí envía JWT (via interceptor de axios), y convierte la respuesta en un blob URL con `URL.createObjectURL()`.

**Limpieza:** El hook hace `URL.revokeObjectURL()` automáticamente al desmontar o cambiar de URL.

### 2. Header.tsx

**Archivo:** `src/shared/components/layout/Header.tsx`

- Reemplazó `getUploadUrl(company.logo_url)` por `useAuthImage(company?.logo_url)`
- El logo se muestra con `<img src={logoSrc}>` donde `logoSrc` es el blob URL autenticado

### 3. Company Profile (Marca tab)

**Archivo:** `src/app/dashboard/company-profile/page.tsx`

- **Logo upload:** Sube a media-service (`category: company_logo`) → guarda URL via `PATCH /companies/:id/brand`
- **Firma upload:** Sube a media-service (`category: company_signature`) → guarda URL via `PATCH /companies/:id/brand`
- **Display:** Usa `useAuthImage` para logo y firma (en lugar de `getMediaUrl()` directo)
- **Delete:** PATCH con `{ logo_url: null }` o `{ legal_rep_signature_url: null }`
- Actualiza tanto el state local como `authStore` para que el Header refleje el cambio inmediatamente

## Flujo completo

```
1. Usuario selecciona imagen
2. Frontend redimensiona (800x300 max para logo)
3. POST /media/upload → { url: "/api/media/{uuid}" }
4. PATCH /companies/:id/brand → { logo_url: "/api/media/{uuid}" }
5. setCompany() + authStore.setCompany() → useAuthImage detecta cambio
6. useAuthImage: GET /media/{uuid} con JWT (blob) → createObjectURL → <img src>
```
