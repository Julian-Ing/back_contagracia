export interface RecalculateAverageCostParams {
  /** Stock actual del producto ANTES de la entrada */
  currentStock: number;
  /** Costo unitario actual del producto */
  currentCost: number;
  /** Cantidad que entra */
  incomingQuantity: number;
  /** Costo unitario de lo que entra */
  incomingCost: number;
}

/**
 * Calcula el nuevo costo promedio ponderado.
 *
 * Formula: (stock_actual * costo_actual + cantidad_entrante * costo_entrante) / (stock_actual + cantidad_entrante)
 *
 * Si no habia stock previo, retorna el costo entrante.
 * Funcion pura: no hace operaciones de DB.
 */
export function recalculateAverageCost(params: RecalculateAverageCostParams): number {
  const { currentStock, currentCost, incomingQuantity, incomingCost } = params;

  if (currentStock <= 0) {
    return incomingCost;
  }

  return (currentStock * currentCost + incomingQuantity * incomingCost) / (currentStock + incomingQuantity);
}
