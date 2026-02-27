# Protección de Rutas y Redirección por Rol

## Descripción

Se implementó protección de rutas basada en el tipo de usuario y redirección automática según el estado de autenticación.

## Tipos de Usuario

| Tipo | Descripción | Ruta |
|------|-------------|------|
| `owner` | Superadmin / Usuario master | `/admin` |
| `company_user` | Dueño de compañía o empleado | `/dashboard` |

## Comportamiento

### Landing Page (`/`)
- Si el usuario ya tiene sesión activa, se redirige automáticamente:
  - `owner` → `/admin`
  - `company_user` → `/dashboard`

### Rutas no definidas (404 - `not-found.tsx`)
- Con sesión: redirige a `/admin` o `/dashboard` según tipo
- Sin sesión: redirige a `/`

### Admin Layout (`/admin/*`)
- Sin sesión: redirige a `/`
- Con sesión pero `userType !== 'owner'`: redirige a `/dashboard`
- Solo usuarios master pueden acceder

### Dashboard Layout (`/dashboard/*`)
- Sin sesión: redirige a `/`

## Botón AdminViewToggle

Se eliminó el botón flotante de cambio entre vista admin/usuario de ambos layouts. Los usuarios master y de compañía son roles completamente separados, no hay necesidad de alternar entre vistas.

## Botón LayoutGrid en páginas admin

- En `page.tsx` y `companies/page.tsx`: se cambió el ícono a `RefreshCw` (era botón de recargar datos, no de cambio de vista).
- En `user-accounts/page.tsx` y `plans/page.tsx`: se eliminó (no tenía funcionalidad).

## Archivos Modificados

- `src/app/page.tsx` - Redirección automática si autenticado
- `src/app/not-found.tsx` - Nuevo, redirige según estado de sesión
- `src/app/admin/layout.tsx` - Protección por `userType === 'owner'`
- `src/app/dashboard/layout.tsx` - Removido `AdminViewToggle`
- `src/app/admin/page.tsx` - Ícono corregido
- `src/app/admin/companies/page.tsx` - Ícono corregido
- `src/app/admin/user-accounts/page.tsx` - Botón removido
- `src/app/admin/plans/page.tsx` - Botón removido
