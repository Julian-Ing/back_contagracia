# Componente reutilizable CostCenterCascadeSelect

**Fecha:** 2026-02-25

## Resumen

Se extrajo el selector cascada de centro de costos (duplicado en 3 archivos con ~40 líneas idénticas) a un hook + componente reutilizable. Se agregó nuevo uso en el modal de anticipos y en ajustes de inventario.

## Archivos creados

| Archivo | Descripción |
|---------|-------------|
| `modules/cost-centers/hooks/useCostCenterTree.ts` | Hook que carga el árbol CC y genera un flatMap |
| `modules/cost-centers/components/CostCenterCascadeSelect.tsx` | Componente cascada reutilizable con props configurables |

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `modules/cost-centers/index.ts` | Agregados exports de `useCostCenterTree` y `CostCenterCascadeSelect` |
| `app/dashboard/banking/page.tsx` | Reemplazado código duplicado CC (~40 líneas) por hook + componente |
| `modules/ar-ap/components/PaymentReceiptForm.tsx` | Reemplazado código duplicado CC (~40 líneas) por hook + componente |
| `app/dashboard/accounting/journal-entries/new/page.tsx` | Reemplazado código duplicado CC (~40 líneas) por hook + componente |
| `app/dashboard/prepayments/CreatePrepaymentModal.tsx` | Limpieza imports parciales + agregado soporte CC con hook + componente |
| `modules/ar-ap/services/prepayments.service.ts` | Agregados campos `cost_center_id` y `cost_center_path` a `CreatePrepaymentPayload` |
| `modules/inventory/components/AdjustStockDialog.tsx` | Agregado selector CC para ajustes de inventario |
| `modules/inventory/services/products.service.ts` | Agregados campos `cost_center_id` y `cost_center_path` a `adjustStock()` |

## API del hook

```typescript
function useCostCenterTree(enabled: boolean): {
  ccTree: CostCenterTreeNode[];
  ccFlatMap: Map<string, CostCenterTreeNode>;
}
```

- `enabled`: típicamente `hasModule('cost_centers')` — no hace fetch si es `false`
- Retorna el árbol raíz y un Map plano id→nodo para lookup rápido

## API del componente

```typescript
interface CostCenterCascadeSelectProps {
  ccTree: CostCenterTreeNode[];
  ccFlatMap: Map<string, CostCenterTreeNode>;
  value: string;          // cost_center_id actual
  path: string[];         // array de IDs desde raíz hasta el nodo seleccionado
  onChange: (id: string, label: string, path: string[]) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';       // sm=h-7 (tablas), md=h-8 (forms)
  itemWidth?: 'auto' | 'fixed';  // auto=flex-1 (forms), fixed=w-44 (tablas)
  placeholder?: string;
}
```

## Uso típico

### En formularios standalone (banking, prepayments)

```tsx
const { ccTree, ccFlatMap } = useCostCenterTree(hasCCModule);

<CostCenterCascadeSelect
  ccTree={ccTree}
  ccFlatMap={ccFlatMap}
  value={form.cost_center_id}
  path={form.cost_center_path}
  onChange={(id, label, path) => setForm(prev => ({
    ...prev, cost_center_id: id, cost_center_label: label, cost_center_path: path,
  }))}
  size="md"
  itemWidth="auto"
/>
```

### En tablas con líneas (journal entries, payment receipts)

```tsx
const { ccTree, ccFlatMap } = useCostCenterTree(hasCCModule);

<CostCenterCascadeSelect
  ccTree={ccTree}
  ccFlatMap={ccFlatMap}
  value={line.cost_center_id}
  path={line.cost_center_path}
  onChange={(id, label, path) => updateLine(line.id, {
    cost_center_id: id, cost_center_label: label, cost_center_path: path,
  })}
  size="sm"
  itemWidth="fixed"
/>
```

## Flujos que NO necesitan CC

- **Cierre de períodos contables** (ClosingPreviewModal) — el asiento de cierre es automático, el backend mueve saldos de cuentas 4/5/6 a patrimonio. No hay selección manual de cuentas individuales.
- **Creación de períodos** (PeriodFormModal) — solo define rangos de fechas, no genera transacciones financieras.
- **Transferencias de inventario** (ProductTransfer, StorageTransfer) — operaciones logísticas puras sin impacto contable directo.

## Notas

- El tipo movimiento CC (`ccMovementTypeOptions`) sigue cargándose por separado en los componentes que lo necesitan (journal entries, payment receipts) ya que no todos los flujos lo usan
- El componente filtra automáticamente nodos `is_active` y soporta selección a cualquier nivel del árbol
- La prop `value` (cost_center_id) no se usa internamente para el renderizado (se usa `path`), pero se pasa para mantener consistencia de interfaz
