# Períodos Contables (Frontend)

## Descripción
Interfaz para gestión de períodos contables con listado, filtros, creación, cierre y reapertura.

## Archivos Creados

### Componentes (`src/modules/accounting/components/`)
- `AccountingPeriodsList.tsx` - Lista de períodos con filtros y acciones
- `PeriodFormModal.tsx` - Modal para crear nuevos períodos
- `PeriodActionsModal.tsx` - Modal para ver historial de acciones
- `PeriodConfirmModal.tsx` - Modal de confirmación para cierre/reapertura

### Hook (`src/modules/accounting/hooks/`)
- `useAccountingPeriods.ts` - Hook para gestión de estado y operaciones

### Servicio (`src/modules/accounting/services/`)
- `accountingPeriods.service.ts` - Llamadas API al backend

### Tipos (`src/modules/accounting/types/`)
- `accountingPeriods.ts` - Interfaces TypeScript

## Componentes

### AccountingPeriodsList
Lista principal de períodos con:
- Búsqueda por nombre/consecutivo
- Filtro por estado (Abierto, Cerrado, Reabierto)
- Filtro por tipo (Anual, Mensual)
- Paginación
- Acciones: Cerrar, Reabrir, Ver historial

### PeriodFormModal
Formulario para crear períodos:
- Selector de tipo (Anual/Mensual)
- Para mensuales: selector de período padre
- Nombre, año, fechas automáticas según mes
- Descripción opcional

### PeriodActionsModal
Historial de acciones con:
- Búsqueda por razón
- Filtro por tipo de acción
- Filtro por rango de fechas (DatePicker)
- Tabla con: Tipo, Razón, Usuario, Fecha

### PeriodConfirmModal
Confirmación de cierre/reapertura:
- Icono según acción (Lock/Unlock)
- Campo de razón obligatorio
- Mensaje de advertencia
- Botones Cancelar/Confirmar

## Permisos

| Permiso | Descripción |
|---------|-------------|
| `closing.monthly.create` | Crear períodos mensuales |
| `closing.annual.create` | Crear períodos anuales |
| `closing.monthly.close` | Cerrar períodos mensuales |
| `closing.annual.close` | Cerrar períodos anuales |
| `closing.monthly.reopen` | Reabrir períodos mensuales |
| `closing.annual.reopen` | Reabrir períodos anuales |

## Hook useAccountingPeriods

```typescript
const {
  periods,      // Lista de períodos
  total,        // Total de registros
  page,         // Página actual
  totalPages,   // Total de páginas
  loading,      // Estado de carga
  error,        // Error si existe
  search,       // Función para buscar
  filterByStatus,  // Filtrar por estado
  filterByAnnual,  // Filtrar por tipo
  setPage,      // Cambiar página
  createPeriod, // Crear período
  closePeriod,  // Cerrar período
  reopenPeriod, // Reabrir período
} = useAccountingPeriods({ limit: 20 });
```

## Integración con Página

En `src/app/dashboard/accounting/closing/page.tsx`:
```tsx
import { AccountingPeriodsList } from '@/modules/accounting/components/AccountingPeriodsList';

export default function ClosingPage() {
  return (
    <ProtectedRoute permission="closing.view">
      <AccountingPeriodsList />
    </ProtectedRoute>
  );
}
```

## Flujo de Uso

1. **Ver períodos**: Usuario accede a Contabilidad > Cierre Contable
2. **Crear período**: Click en "Nuevo Período", seleccionar tipo, llenar datos
3. **Cerrar período**: Click en icono candado, ingresar razón, confirmar
4. **Reabrir período**: Click en icono candado abierto, ingresar razón, confirmar
5. **Ver historial**: Click en icono ojo, ver todas las acciones del período

## Estilos

- Colores de estado:
  - OPEN: Verde (`bg-green-100 text-green-700`)
  - CLOSED: Rojo (`bg-red-100 text-red-700`)
  - REOPENED: Ámbar (`bg-amber-100 text-amber-700`)

- Colores de acción:
  - OPEN: Verde
  - CLOSE: Rojo
  - REOPEN: Ámbar
  - ADJUST: Azul
