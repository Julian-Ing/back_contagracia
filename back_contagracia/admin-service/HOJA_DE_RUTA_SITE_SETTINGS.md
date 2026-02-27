# Hoja de Ruta — Configuración del Sitio (Site Settings)

## Resumen

Crear un módulo de administración para gestionar metadatos SEO, favicon, OG image y scripts de seguimiento (tracking pixels) del sitio. Accesible desde el sidebar del admin en `/admin/site-settings`.

---

## Estado General

| Paso | Descripción | Estado |
|------|-------------|--------|
| Paso 1 | Modelo Prisma `SiteSetting` en master schema | ✅ Completado |
| Paso 2 | Backend — Módulo `site-settings` en admin-service | ✅ Completado |
| Paso 3 | Seed de settings iniciales | ✅ Completado |
| Paso 4 | Frontend — Service (admin.service.ts) | ✅ Completado |
| Paso 5 | Frontend — Página `/admin/site-settings` | ✅ Completado |
| Paso 6 | Frontend — Agregar al sidebar admin | ✅ Completado |
| Paso 7 | Frontend — Metadata dinámica en root layout | ✅ Completado |
| Paso 8 | Frontend — Tracking Scripts injection | ✅ Completado |

---

## Contexto

### Proyecto anterior (horizont)
- Vista en `/admin/tracking-settings` para gestionar scripts de seguimiento
- Textarea para pegar HTML/JS (GA4, Meta Pixel, GTM, Google Ads)
- Almacena en tabla `site_settings` (Supabase, key-value)
- Inyecta scripts en la landing page via React Helmet

### Proyecto nuevo (NuevoContagracia)
- No existe gestión de metadatos ni tracking scripts
- Metadata hardcodeada en `src/app/layout.tsx` (`export const metadata`)
- Favicon estático en `src/app/favicon.ico`
- Admin-service ya tiene patrón de uploads (CMS) y endpoints públicos (`@Public()`)

---

## Detalle por Paso

### Paso 1: Modelo Prisma (schema-master.prisma) ✅

**MODIFICAR:** `contagracia-shared-modules/prisma/schema-master.prisma`

Agregar modelo `SiteSetting`:
- `key` (String, PK) — clave del setting
- `value` (String?, Text) — valor del setting
- `description` (String?) — descripción
- `created_at`, `updated_at` — timestamps

Después ejecutar:
- `pnpm prisma:generate`
- `pnpm prisma:push:master`

**Criterios:**
- [x] Modelo creado en schema-master.prisma
- [x] `prisma:generate` exitoso
- [x] `prisma:push:master` crea tabla `site_settings`

---

### Paso 2: Backend — Módulo site-settings en admin-service ✅

**CREAR archivos en:** `admin-service/src/modules/site-settings/`

**2.1 — DTO:** `dto/update-site-setting.dto.ts`
- `UpdateSiteSettingDto` con campo `value` (string | null, opcional)

**2.2 — Service:** `site-settings.service.ts`
- `findAll()` — todas las settings
- `findOne(key)` — una setting
- `upsert(key, value)` — crear o actualizar
- `getPublicMetadata()` — retorna objeto con keys de metadata

**2.3 — Uploads Service:** `site-uploads.service.ts`
- Patrón igual a `cms/services/uploads.service.ts`
- Directorio: `../uploads/site/`
- Favicon: `.ico`, `.png`, `.svg` (max 2MB)
- OG Image: `.jpg`, `.png`, `.webp` (max 2MB)
- Al subir nuevo, borra el anterior

**2.4 — Controller Admin:** `site-settings.controller.ts`
- `GET /admin/site-settings` — listar todas
- `PUT /admin/site-settings/:key` — actualizar una
- `POST /admin/site-settings/upload/favicon` — subir favicon
- `POST /admin/site-settings/upload/og-image` — subir OG image

**2.5 — Controller Público:** `site-settings-public.controller.ts`
- `@Public()` — sin autenticación
- `GET /site-settings/metadata` — retorna metadatos públicos

**2.6 — Module:** `site-settings.module.ts`
- Registrar controllers, services, importar PrismaModule

**MODIFICAR:** `admin-service/src/app.module.ts` — agregar `SiteSettingsModule`

**Criterios:**
- [x] Endpoints admin protegidos funcionan con JWT
- [x] Endpoint público retorna metadata sin auth
- [x] Upload favicon guarda en `uploads/site/`
- [x] Upload OG image guarda en `uploads/site/`

---

### Paso 3: Seed de settings iniciales ✅

**CREAR:** `contagracia-shared-modules/prisma/scripts/seed-site-settings.ts`

Settings a insertar:

| Key | Default | Description |
|-----|---------|-------------|
| `site_title` | `"Contagracia - Software Contable para MiPymes"` | Título del sitio |
| `site_description` | `"Software contable especializado para MiPymes..."` | Meta descripción |
| `site_keywords` | `"contabilidad, erp, pymes, colombia, software contable"` | Keywords SEO |
| `og_image_url` | `null` | Imagen para redes sociales |
| `favicon_url` | `null` | URL del favicon personalizado |
| `tracking_scripts` | `null` | Scripts de seguimiento |

**Criterios:**
- [x] Seed ejecuta sin errores
- [x] 6 registros insertados en `site_settings`
- [x] Valores por defecto correctos

---

### Paso 4: Frontend — Service ✅

**MODIFICAR:** `front_contagracia/src/modules/admin/services/admin.service.ts`

Agregar métodos:
- `getSiteSettings()` — GET todas las settings
- `updateSiteSetting(key, value)` — PUT actualizar
- `uploadFavicon(file)` — POST multipart
- `uploadOgImage(file)` — POST multipart

**Criterios:**
- [x] Métodos agregados al adminService
- [x] Usan `adminClient` con rutas correctas

---

### Paso 5: Frontend — Página `/admin/site-settings` ✅

**CREAR:** `front_contagracia/src/app/admin/site-settings/page.tsx`

3 secciones en Cards:

**Sección 1 — SEO y Metadatos:**
- Inputs: título, descripción (textarea), keywords (textarea)
- Preview de cómo se vería en Google
- Contadores de caracteres (título 60, descripción 160)
- Botón guardar

**Sección 2 — Identidad Visual:**
- Favicon: zona de upload, preview, botón eliminar
- OG Image: zona de upload, preview, dimensiones recomendadas (1200x630)

**Sección 3 — Scripts de Seguimiento:**
- Textarea monospace para scripts
- Contador de caracteres + detector de `<script>` tags
- Guía rápida (GA4, Meta Pixel, GTM, Google Ads)
- Badge Activo/Inactivo
- Advertencia de seguridad

**Criterios:**
- [x] Página carga correctamente en `/admin/site-settings`
- [x] Settings se cargan desde la API
- [x] Guardar cada sección funciona
- [x] Upload de favicon muestra preview
- [x] Upload de OG image muestra preview
- [x] Scripts textarea con contador funciona
- [x] Dark mode correcto

---

### Paso 6: Sidebar Admin ✅

**MODIFICAR:** `front_contagracia/src/shared/components/layout/AdminSidebar.tsx`

- Agregar item en sección "Sistema": `{ id: 'site-settings', label: 'Configuración del Sitio', href: '/admin/site-settings', icon: Settings }`
- Importar `Settings` de lucide-react

**Criterios:**
- [x] Item visible en sidebar
- [x] Navegación funciona
- [x] Active state correcto

---

### Paso 7: Metadata Dinámica en Root Layout ✅

**MODIFICAR:** `front_contagracia/src/app/layout.tsx`

- Reemplazar `export const metadata` por `export async function generateMetadata()`
- Fetch al endpoint público `/site-settings/metadata`
- Fallback a valores hardcodeados si API no responde
- Favicon dinámico via `icons` en metadata
- Favicon estático movido a `public/favicon-default.ico` (Next.js auto-detectaba `src/app/favicon.ico`)

**Criterios:**
- [x] `<head>` refleja título/descripción de la DB
- [x] Favicon dinámico funciona
- [x] Fallback funciona si API está caída

---

### Paso 8: Tracking Scripts Injection ✅

**CREAR:** `front_contagracia/src/shared/components/TrackingScripts.tsx`

- Client component
- Fetch scripts del endpoint público
- Parsea `<script>` tags y los ejecuta con `useEffect`
- Se renderiza en `layout.tsx` dentro del `<body>`

**Criterios:**
- [x] Scripts se inyectan correctamente
- [x] No rompe la app si no hay scripts
- [x] Maneja errores de scripts malformados

---

## Archivos Creados/Modificados

### Backend (admin-service)
- `contagracia-shared-modules/prisma/schema-master.prisma` — Modelo SiteSetting
- `contagracia-shared-modules/prisma/scripts/seed-site-settings.ts` — Seed
- `admin-service/src/modules/site-settings/dto/update-site-setting.dto.ts`
- `admin-service/src/modules/site-settings/site-settings.service.ts`
- `admin-service/src/modules/site-settings/site-uploads.service.ts`
- `admin-service/src/modules/site-settings/site-settings.controller.ts`
- `admin-service/src/modules/site-settings/site-settings-public.controller.ts`
- `admin-service/src/modules/site-settings/site-settings.module.ts`
- `admin-service/src/app.module.ts`

### Frontend (front_contagracia)
- `src/modules/admin/services/admin.service.ts`
- `src/app/admin/site-settings/page.tsx`
- `src/shared/components/layout/AdminSidebar.tsx`
- `src/app/layout.tsx`
- `src/shared/components/TrackingScripts.tsx`
- `src/app/favicon.ico` → movido a `public/favicon-default.ico`

---

## Endpoints API

**Admin (protegidos con JWT):**
- `GET /api/admin/site-settings` — Listar todas las settings
- `PUT /api/admin/site-settings/:key` — Actualizar un setting
- `POST /api/admin/site-settings/upload/favicon` — Subir favicon
- `POST /api/admin/site-settings/upload/og-image` — Subir OG image

**Público (sin auth):**
- `GET /api/site-settings/metadata` — Metadatos del sitio
