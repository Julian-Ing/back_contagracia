# Hoja de Ruta: Plans - Pulido y Mejoras

## Objetivo

Pulir el módulo de gestión de planes existente (`/admin/plans`) para que los módulos se carguen dinámicamente desde el backend (en vez de estar hardcodeados en `MODULE_GROUPS`), implementar el sistema de dependencias entre módulos (auto-enable/disable recursivo como en `horizont`), y agregar toast notifications.

---

## Contexto

### Estado Actual

- **Backend:** CRUD completo de planes + gestión de módulos (M:N via `plan_modules`) — funcional
- **Frontend:** Página con vista cards/tabla, filtros, `PlanForm` con selección de módulos agrupados — funcional
- **Problema 1:** Los grupos de módulos están hardcodeados en `PlanForm.tsx` (`MODULE_GROUPS` constante)
- **Problema 2:** No hay sistema de dependencias entre módulos (en `horizont` al activar "Ventas" se activaba "Inventario" automáticamente si era dependencia)
- **Problema 3:** No hay toast notifications (usa `setError` inline)

### Proyecto anterior (`horizont`)

- **Archivo:** `src/pages/admin/PlanManagement.jsx` (~637 líneas)
- **Módulos:** Hardcoded en `src/lib/modules.js` con `requires` y `requiresAny` para dependencias
- **Dependencias:** `getAllDependencies(key)` recursivo para auto-activar, `getAllDependents(key)` recursivo para auto-desactivar
- **Toast:** `useToast()` de shadcn

### Arquitectura Backend (referencia: `back_contagracia/README.md`)

- **Monorepo pnpm** con workspaces
- **Shared modules:** `contagracia-shared-modules/` → Prisma schemas, seeds
- **Prisma:** `schema-master.prisma` genera `@prisma/client-master`
- **Patrón:** Controller + Service + DTO (con class-validator)
- **DB push (dev):** `pnpm prisma:push:master` desde `contagracia-shared-modules/`

### Arquitectura Frontend (referencia: `front_contagracia/ARQUITECTURA.md`)

- **Feature-based:** Módulos en `src/modules/` con components, hooks, services, stores, types
- **Shared UI:** `src/shared/components/ui/` (Shadcn)
- **API Client:** `adminClient` de `@/shared/services/api/apiClient` (Axios)
- **Service Pattern:** `export const adminService = { ... }` con métodos async
- **Toast:** `react-hot-toast` (ya usado en blog y otras páginas)

---

## Alcance Funcional

### Cambios en Schema Prisma

| Cambio | Descripción | Estado |
|---|---|---|
| Agregar `group` a Module | Campo para agrupar módulos (General, Operaciones, Finanzas, POS, HR, Otros) | ✅ Completado |
| Crear modelo `ModuleDependency` | Tabla M:N para dependencias entre módulos (module_id → depends_on_id) | ✅ Completado |
| Actualizar seed de módulos | Agregar group y dependencias a cada módulo en el seed | ✅ Completado |

### Cambios en Backend

| Cambio | Descripción | Estado |
|---|---|---|
| Endpoint GET /admin/modules incluir group y dependencias | Retornar `group`, `dependencies` y `dependents` en cada módulo | ✅ Completado |
| Actualizar endpoint GET /admin/plans para incluir módulos completos | Asegurar que `plan_modules` incluye `module` con `group` y dependencias | ✅ Completado |

### Cambios en Frontend

| Cambio | Descripción | Estado |
|---|---|---|
| PlanForm: módulos agrupados desde backend | Reemplazar `MODULE_GROUPS` hardcoded por agrupación dinámica usando `module.group` del backend | ✅ Completado |
| PlanForm: dependencias de módulos | Implementar auto-enable/disable recursivo (al activar un módulo, activar sus dependencias; al desactivar, desactivar sus dependientes) | ✅ Completado |
| Plans page: toast notifications | Reemplazar `setError` inline por `react-hot-toast` en create, update, delete | ✅ Completado |
| Plans page: toast en PlanForm save | Mostrar toast de éxito/error al guardar plan | ✅ Completado |
| Types: actualizar Module interface | Agregar `group`, `dependencies`, `dependents` al tipo `Module` | ✅ Completado |
| Admin service: actualizar si es necesario | Verificar que `getAllModules()` retorna los nuevos campos | ✅ Completado |

---

## Implementación por Fases

### Fase 1: Schema Prisma — Agregar group y dependencias

**Archivo:** `contagracia-shared-modules/prisma/schema-master.prisma`

**Cambios en modelo `Module`:**
```prisma
model Module {
  id          String   @id @default(uuid())
  module_key  String   @unique
  module_name String
  description String?
  icon        String?
  group       String   @default("Otros")  // ← NUEVO: "General", "Operaciones", "Finanzas", "POS", "Recursos Humanos", "Otros"
  sort_order  Int      @default(0)
  is_active   Boolean  @default(true)
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  // Relations
  actions        SystemAction[]
  plan_modules   PlanModule[]
  dependencies   ModuleDependency[] @relation("ModuleDependencies")   // ← NUEVO
  dependents     ModuleDependency[] @relation("ModuleDependents")     // ← NUEVO

  @@map("modules")
}
```

**Nuevo modelo `ModuleDependency`:**
```prisma
model ModuleDependency {
  id            String   @id @default(uuid())
  module_id     String   // El módulo que TIENE la dependencia
  depends_on_id String   // El módulo del que DEPENDE
  created_at    DateTime @default(now())

  module     Module @relation("ModuleDependencies", fields: [module_id], references: [id], onDelete: Cascade)
  depends_on Module @relation("ModuleDependents", fields: [depends_on_id], references: [id], onDelete: Cascade)

  @@unique([module_id, depends_on_id])
  @@index([module_id])
  @@index([depends_on_id])
  @@map("module_dependencies")
}
```

**Comandos:**
```bash
cd contagracia-shared-modules
pnpm prisma:generate
pnpm prisma:push:master
```

---

### Fase 2: Seed — Actualizar módulos con group y dependencias

**Archivo:** `contagracia-shared-modules/prisma/seeds/` (archivo de seed de módulos)

**Grupos a asignar:**

| Group | Módulos |
|---|---|
| General | dashboard, company_profile, configurations, user_management |
| Operaciones | sales, quotes, inventory, inventory_management, purchase_orders, purchases, expenses, third_parties |
| Finanzas | ar_ap, accounting, banking, fixed_assets, cost_centers, tax, closing, exogenous, reports |
| POS | point_of_sale, cash_registers |
| Recursos Humanos | core_hr, time_attendance, leaves_vacations, hr_payroll, hr_expenses, hr_performance |
| Otros | crm, communication_templates, radian |

**Dependencias a crear (basadas en `horizont/src/lib/modules.js`):**

| Módulo | Depende de |
|---|---|
| sales | inventory, third_parties |
| purchases | inventory, third_parties |
| quotes | sales (o crm) |
| purchase_orders | purchases |
| expenses | third_parties |
| ar_ap | third_parties |
| accounting | ar_ap |
| banking | accounting |
| fixed_assets | accounting |
| cost_centers | accounting |
| tax | accounting |
| closing | accounting |
| exogenous | accounting, tax |
| reports | accounting |
| point_of_sale | sales, inventory |
| cash_registers | point_of_sale |
| time_attendance | core_hr |
| leaves_vacations | core_hr |
| hr_payroll | core_hr |
| hr_expenses | core_hr |
| hr_performance | core_hr |
| inventory_management | inventory |

---

### Fase 3: Backend — Actualizar endpoints de módulos

**Archivos a modificar:**
- `admin-service/src/modules/plans/plans.service.ts`

**Cambios:**

1. **`getAllModules()` o equivalente:** Incluir `group`, `dependencies` (con `depends_on` module info), y `dependents` en la respuesta
2. **`findAll()` de planes:** Asegurar que `plan_modules → module` incluye `group`

**Response esperado de GET /admin/modules:**
```json
[
  {
    "id": "uuid",
    "module_key": "sales",
    "module_name": "Ventas",
    "group": "Operaciones",
    "sort_order": 5,
    "is_active": true,
    "dependencies": [
      { "id": "uuid", "depends_on": { "id": "uuid", "module_key": "inventory", "module_name": "Inventario" } }
    ],
    "dependents": [
      { "id": "uuid", "module": { "id": "uuid", "module_key": "point_of_sale", "module_name": "Punto de Venta" } }
    ]
  }
]
```

---

### Fase 4: Frontend — Types y Service

**Archivo:** `front_contagracia/src/modules/admin/types/index.ts`

**Cambios en interface `Module`:**
```typescript
export interface Module {
  id: string;
  module_key: string;
  module_name: string;
  description?: string;
  icon?: string;
  group: string;       // ← NUEVO
  sort_order: number;
  is_active: boolean;
  dependencies?: ModuleDependencyInfo[];  // ← NUEVO
  dependents?: ModuleDependencyInfo[];    // ← NUEVO
}

export interface ModuleDependencyInfo {
  id: string;
  depends_on_id?: string;
  module_id?: string;
  depends_on?: { id: string; module_key: string; module_name: string };
  module?: { id: string; module_key: string; module_name: string };
}
```

**Archivo:** `front_contagracia/src/modules/admin/services/admin.service.ts`

- Verificar que `getAllModules()` no necesita cambios (ya retorna todo lo que el backend envía)

---

### Fase 5: Frontend — PlanForm con módulos dinámicos y dependencias

**Archivo:** `front_contagracia/src/modules/admin/components/PlanForm.tsx`

**Cambios:**

1. **Eliminar `MODULE_GROUPS` hardcodeado** (líneas 21-28)
2. **Agrupar módulos dinámicamente** usando `module.group` del backend:
   ```typescript
   const groupedModules = useMemo(() => {
     const groups: Record<string, Module[]> = {};
     const selectableModules = modules.filter(m => !REQUIRED_MODULE_KEYS.includes(m.module_key));
     for (const mod of selectableModules) {
       const group = mod.group || 'Otros';
       if (!groups[group]) groups[group] = [];
       groups[group].push(mod);
     }
     // Ordenar cada grupo por sort_order
     for (const g of Object.values(groups)) g.sort((a, b) => a.sort_order - b.sort_order);
     return groups;
   }, [modules]);
   ```

3. **Implementar dependencias recursivas:**
   ```typescript
   // Al ACTIVAR un módulo: activar todas sus dependencias recursivamente
   const getAllDependencies = (moduleId: string, visited = new Set<string>()): string[] => {
     if (visited.has(moduleId)) return [];
     visited.add(moduleId);
     const mod = modules.find(m => m.id === moduleId);
     if (!mod?.dependencies?.length) return [];
     let deps: string[] = [];
     for (const dep of mod.dependencies) {
       const depId = dep.depends_on?.id || dep.depends_on_id;
       if (depId) {
         deps.push(depId);
         deps = [...deps, ...getAllDependencies(depId, visited)];
       }
     }
     return [...new Set(deps)];
   };

   // Al DESACTIVAR un módulo: desactivar todos los que dependen de él recursivamente
   const getAllDependents = (moduleId: string, visited = new Set<string>()): string[] => {
     if (visited.has(moduleId)) return [];
     visited.add(moduleId);
     const mod = modules.find(m => m.id === moduleId);
     if (!mod?.dependents?.length) return [];
     let deps: string[] = [];
     for (const dep of mod.dependents) {
       const depId = dep.module?.id || dep.module_id;
       if (depId) {
         deps.push(depId);
         deps = [...deps, ...getAllDependents(depId, visited)];
       }
     }
     return [...new Set(deps)];
   };
   ```

4. **Actualizar `handleModuleToggle`:**
   ```typescript
   const handleModuleToggle = (moduleId: string) => {
     setFormData(prev => {
       const isSelected = prev.selected_module_ids.includes(moduleId);
       if (!isSelected) {
         // Activar: incluir dependencias
         const deps = getAllDependencies(moduleId);
         return { ...prev, selected_module_ids: [...new Set([...prev.selected_module_ids, moduleId, ...deps])] };
       } else {
         // Desactivar: remover dependientes
         const dependents = getAllDependents(moduleId);
         const toRemove = new Set([moduleId, ...dependents]);
         return { ...prev, selected_module_ids: prev.selected_module_ids.filter(id => !toRemove.has(id) || requiredModuleIds.includes(id)) };
       }
     });
   };
   ```

---

### Fase 6: Frontend — Toast Notifications

**Archivo:** `front_contagracia/src/app/admin/plans/page.tsx`

**Cambios:**

1. Agregar `import toast from 'react-hot-toast'`
2. Reemplazar `setError(...)` por `toast.error(...)` en:
   - `fetchData()` catch
   - `confirmDelete()` catch
   - `handleSavePlan()` catch
3. Agregar `toast.success(...)` en:
   - `confirmDelete()` success → `toast.success('Plan eliminado correctamente')`
   - `handleSavePlan()` success → `toast.success(editingPlan ? 'Plan actualizado' : 'Plan creado')`
4. Opcional: eliminar `error` state y el banner rojo inline si ya no se necesita

---

## Dependencias entre Fases

```
Fase 1 (Schema) ──→ Fase 2 (Seed) ──→ Fase 3 (Backend)
                                              │
                                    ┌─────────┴─────────┐
                                    ▼                   ▼
                              Fase 4 (Types)      Fase 6 (Toasts)
                                    │
                                    ▼
                              Fase 5 (PlanForm)
```

---

## Mapeo de Funcionalidades: Viejo → Nuevo

| Viejo (horizont) | Nuevo (NuevoContagracia) |
|---|---|
| `MODULES` hardcoded en `lib/modules.js` | `Module` table en DB con `group` field |
| `MODULES[key].requires` array | `ModuleDependency` table (M:N) |
| `getAllDependencies()` client-side con `MODULES` | `getAllDependencies()` client-side con `module.dependencies` del backend |
| `getAllDependents()` client-side | `getAllDependents()` client-side con `module.dependents` del backend |
| `MODULE_GROUPS` hardcoded en PlanForm | Agrupación dinámica por `module.group` |
| `useToast()` de shadcn | `react-hot-toast` |
| `SearchableSelect` para filtro de módulos | `Select` nativo (ya implementado) |

---

## Criterios de Aceptación

- [x] Schema: Campo `group` agregado al modelo `Module`
- [x] Schema: Modelo `ModuleDependency` creado
- [x] Seed: Módulos actualizados con grupo correcto
- [x] Seed: Dependencias entre módulos creadas (32 módulos, 26 dependencias)
- [x] Backend: GET /admin/modules retorna `group`, `dependencies`, `dependents`
- [x] Frontend: `MODULE_GROUPS` eliminado del PlanForm
- [x] Frontend: Módulos agrupados dinámicamente por `module.group`
- [x] Frontend: Auto-enable de dependencias al activar módulo
- [x] Frontend: Auto-disable de dependientes al desactivar módulo
- [x] Frontend: Toast de éxito al crear/editar/eliminar plan
- [x] Frontend: Toast de error en operaciones fallidas
- [x] Sin errores de TypeScript
- [x] Patrones consistentes con el resto del proyecto
