export interface MoveStockParams {
    /** Prisma transaction client */
    tx: any;
    /** ID del producto */
    productId: string;
    /** Dirección: IN = entrada, OUT = salida */
    direction: 'IN' | 'OUT';
    /** Cantidad (siempre positiva) */
    quantity: number;
    /** Key del tipo de movimiento (sale, purchase, adjustment, storage_transfer, product_transfer) */
    typeKey: string;
    /** ID de la bodega (requerido si hasInventoryManagement y producto no es servicio) */
    storageId?: string | null;
    /** ID del documento/transferencia origen */
    referenceId?: string | null;
    /** Consecutivo del documento origen */
    referenceConsecutive?: string | null;
    /** Notas opcionales */
    notes?: string | null;
    /** Fecha del movimiento (default: hoy) */
    date?: Date;
    /** ¿La empresa tiene el módulo inventory_management? — lo resuelve el llamador */
    hasInventoryManagement: boolean;
    /** ID del tenant_user que ejecuta (null = operación de sistema, salta validación de almacén) */
    userId?: string | null;
}
export interface MoveStockResult {
    movementId: string;
    consecutive: string;
    newProductStock: number;
    newStorageStock: number | null;
}
/**
 * Mueve stock de un producto dentro de una transacción.
 *
 * 1. Valida producto (existe, activo)
 * 2. Si hasInventoryManagement + no servicio: valida bodega, almacén, acceso usuario
 * 3. Actualiza Product.stock
 * 4. Upsert StorageStock si aplica
 * 5. Crea ProductMovement (kardex) con consecutivo IM-xxxx
 *
 * IMPORTANTE: recibe tx, NUNCA crea su propia transacción.
 * El llamador valida permisos y envuelve en $transaction.
 */
export declare function moveStock(params: MoveStockParams): Promise<MoveStockResult>;
