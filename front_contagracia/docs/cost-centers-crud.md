# CRUD Frontend - Centros de Costos

**Fecha:** 2026-02-24

## Resumen

Módulo frontend para gestión de centros de costos con vista de árbol jerárquico, búsqueda fuzzy, crear/editar/eliminar/reactivar.

## Archivos creados

| Archivo | Descripción |
|---------|-------------|
| `app/dashboard/cost-centers/page.tsx` | Página principal con ProtectedRoute y permisos |
| `modules/cost-centers/components/CostCentersList.tsx` | Componente principal: árbol, búsqueda, CRUD inline |
| `modules/cost-centers/services/costCenters.service.ts` | Servicio API (getAll, getTree, create, update, delete, reactivate) |
| `modules/cost-centers/types/index.ts` | Interfaces TypeScript |
| `modules/cost-centers/index.ts` | Barrel export |

## Ruta

- **URL:** `/dashboard/cost-centers`
- **Navegación:** Ya configurada en `config/navigation.ts` con icono `Ruler`, módulo `cost_centers`, permiso `cost_centers.view`

## Funcionalidades

### Vista de árbol
- Muestra centros de costos en jerarquía recursiva (parent → children)
- Expandir/colapsar nodos individuales o todos a la vez
- Auto-expande todos los nodos al buscar
- Muestra: consecutivo, nombre, descripción, badge de inactivo, conteo de relaciones

### Búsqueda
- Input con debounce 300ms
- Llama al endpoint `?tree=true&search=...` que usa `word_similarity` con pg_trgm
- Filtra árbol mostrando nodos que coinciden + sus ancestros

### Filtros
- Switch "Inactivos" para mostrar/ocultar centros desactivados

### Acciones por nodo (hover)
- **+** Crear sub-centro (pasa parent_id al modal)
- **Editar** nombre y descripción
- **Reactivar** (solo si inactivo, icono RotateCcw verde)
- **Eliminar** con ConfirmDialog — backend decide hard/soft delete

### Modal crear/editar
- Campos: nombre (requerido), descripción (opcional)
- Al crear sub-centro muestra el nombre del padre
- Validación: nombre no vacío

### Permisos
- `cost_centers.view` — acceso a la página
- `cost_centers.create` — botón crear y crear sub-centro
- `cost_centers.edit` — botón editar y reactivar
- `cost_centers.delete` — botón eliminar

## Dependencias
- Backend: `accounting-service` endpoints `/cost-centers`
- API client: `accountingClient` de `@/shared/services/api/apiClient`
- Componentes: Card, Dialog, ConfirmDialog, Badge, Switch, Input, Button (shadcn/ui)
