# Reemplazo de confirm() nativo por ConfirmDialog modal

**Fecha:** 2026-02-21

## Descripcion
Se reemplazaron todos los `window.confirm()` nativos de JavaScript en los modulos de inventario por un componente `ConfirmDialog` reutilizable basado en AlertDialog de shadcn/ui.

## Componente nuevo
- `src/shared/components/ConfirmDialog.tsx`
- Props: `open`, `onOpenChange`, `title`, `description`, `confirmLabel`, `cancelLabel`, `variant` (`destructive` | `default`), `onConfirm` (async)
- Muestra spinner mientras ejecuta la accion
- Icono de alerta en variante destructive

## Archivos modificados

### AttributesList.tsx (3 confirms reemplazados)
- Eliminar atributo
- Toggle activar/desactivar atributo (usa variant `default` para activar, `destructive` para desactivar)
- Eliminar opcion de atributo

### CategoriesList.tsx (1 confirm reemplazado)
- Eliminar categoria

### WarehouseDetail.tsx (2 confirms reemplazados)
- Eliminar bodega
- Desasignar usuario del almacen

### WarehousesList.tsx (1 confirm reemplazado)
- Eliminar almacen

## Patron de uso
Cada componente usa un estado `confirmConfig` + `confirmOpen`:
```tsx
const [confirmOpen, setConfirmOpen] = useState(false);
const [confirmConfig, setConfirmConfig] = useState<{
  title: string; description: string; confirmLabel: string;
  variant?: 'destructive' | 'default';
  onConfirm: () => Promise<void>;
}>({ title: '', description: '', confirmLabel: '', onConfirm: async () => {} });
```
Se configura y abre con `setConfirmConfig({...}); setConfirmOpen(true);`
