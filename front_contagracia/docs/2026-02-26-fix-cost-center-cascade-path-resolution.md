# Fix: CostCenterCascadeSelect no mostraba centro de costos en edicion

**Fecha:** 2026-02-26

## Problema

Al precargar un formulario en modo edicion (ej: editar asiento contable, recibo de pago), el `CostCenterCascadeSelect` recibia un `value` (cost_center_id) valido pero con `path` vacio (`[]`). Como el componente usa `path` para renderizar los selects en cascada, no mostraba nada — el centro de costos parecia no estar seleccionado.

Esto ocurria porque los datos de edicion del backend traen `cost_center_id` pero no siempre el `path` completo (array de IDs desde raiz hasta el nodo).

## Solucion

Se agrego un helper `buildPathFromValue()` y un memo `effectivePath` que auto-resuelve la cascada desde un ID cuando el path esta vacio:

```typescript
function buildPathFromValue(
  value: string,
  flatMap: Map<string, CostCenterTreeNode>
): string[] {
  // Navega hacia arriba via parent_id para construir el path completo
  const path: string[] = [];
  let current = flatMap.get(value);
  while (current) {
    path.unshift(current.id);
    current = current.parent_id ? flatMap.get(current.parent_id) : undefined;
  }
  return path;
}

const effectivePath = useMemo(() => {
  if (path.length > 0) return path;
  if (value && ccFlatMap.size > 0) return buildPathFromValue(value, ccFlatMap);
  return [];
}, [path, value, ccFlatMap]);
```

El componente ahora usa `effectivePath` en vez de `path` directo para el renderizado.

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/modules/cost-centers/components/CostCenterCascadeSelect.tsx` | Agregado `buildPathFromValue()` helper + memo `effectivePath` que auto-resuelve path desde value ID |
