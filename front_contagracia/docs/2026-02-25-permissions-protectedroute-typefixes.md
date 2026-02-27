# Permisos en Header, ProtectedRoute y correcciones de tipos

**Fecha:** 2026-02-25

## Cambios

### Header - Filtrado por permisos
- **Archivo:** `src/shared/components/layout/Header.tsx`
- "Perfil de Empresa" solo visible si `can('company.profile.view')`
- "Configuraciones" solo visible si `can('config.view')`
- Antes no tenian ninguna validacion de permisos

### Company Profile - ProtectedRoute
- **Archivo:** `src/app/dashboard/company-profile/page.tsx`
- Envuelto con `<ProtectedRoute permission="company.profile.view">`
- Muestra `<AccessDenied>` si el usuario no tiene permiso

### Permisos de Saldos Iniciales
- **Archivo:** `src/modules/accounting/components/PeriodActionsModal.tsx`
- Boton importar requiere `accounting.opening_balance.import`
- Boton reversar requiere `accounting.opening_balance.reverse`

### Correcciones de tipos TypeScript
- **`src/shared/types/user.types.ts`**: Agregado `dv?: string` a `Company`
- **`src/modules/company/types/index.ts`**: Agregado `logo_url?: string | null` a `Company`
- **`src/modules/crm/types/index.ts`**: Corregido `html_body` → `body_html` en `CrmEmailTemplate`
- **`src/app/dashboard/company-profile/components/IntegrationsTab.tsx`**: Corregido `template.html_body` → `template.body_html`
