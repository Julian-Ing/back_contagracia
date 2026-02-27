"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recalculateAverageCost = recalculateAverageCost;
/**
 * Calcula el nuevo costo promedio ponderado.
 *
 * Formula: (stock_actual * costo_actual + cantidad_entrante * costo_entrante) / (stock_actual + cantidad_entrante)
 *
 * Si no habia stock previo, retorna el costo entrante.
 * Funcion pura: no hace operaciones de DB.
 */
function recalculateAverageCost(params) {
    const { currentStock, currentCost, incomingQuantity, incomingCost } = params;
    if (currentStock <= 0) {
        return incomingCost;
    }
    return (currentStock * currentCost + incomingQuantity * incomingCost) / (currentStock + incomingQuantity);
}
