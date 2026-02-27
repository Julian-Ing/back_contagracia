# Tab Facturación y Nómina Electrónica — Perfil de Empresa

**Fecha:** 2026-02-17

## Cambios

### Navegación (sidebar)
- `radian` en sidebar actualizado: `modules: ['electronic_documents']`, `permission: 'electronic_documents.radian.view'`
- `ALL_MODULES`: `'radian'` → `'electronic_documents'`

### Perfil de Empresa — Tab Facturación
- Tab renombrado a "Fact / Nóm. Electrónica y Resoluciones"
- Tab condicionado por permisos: solo visible si el usuario tiene `electronic_documents.view` o `electronic_documents.resolutions.view`
- Contenido extraído a componente separado `ElectronicTab`

### Componentes nuevos
- **`ElectronicTab.tsx`** — Orquestador con sub-tabs condicionados por permisos
  - Si tiene ambos permisos: muestra tabs "Configuración DIAN" y "Resoluciones"
  - Si tiene solo uno: muestra solo ese contenido (sin barra de tabs)
  - Si no tiene ninguno: muestra mensaje "Sin acceso"
- **`DianConfigTab.tsx`** — Contenido de configuración DIAN y producción (placeholder)
- **`ResolutionsTab.tsx`** — Gestión de resoluciones de facturación (placeholder)

### Permisos usados
- `electronic_documents.view` — para tab principal y sub-tab configuración DIAN
- `electronic_documents.resolutions.view` — para sub-tab resoluciones

## Archivos modificados
- `src/config/navigation.ts` — sidebar radian → electronic_documents
- `src/app/dashboard/company-profile/page.tsx` — import ElectronicTab, filtro tabs por permisos

## Archivos nuevos
- `src/app/dashboard/company-profile/components/ElectronicTab.tsx`
- `src/app/dashboard/company-profile/components/DianConfigTab.tsx`
- `src/app/dashboard/company-profile/components/ResolutionsTab.tsx`
