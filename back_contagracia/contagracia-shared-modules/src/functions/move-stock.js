"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.moveStock = moveStock;
const common_1 = require("@nestjs/common");
const get_next_consecutive_1 = require("./get-next-consecutive");
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
async function moveStock(params) {
    const { tx, productId, direction, quantity, typeKey, storageId, referenceId, referenceConsecutive, notes, date, hasInventoryManagement, userId, } = params;
    // --- Validaciones básicas ---
    if (quantity <= 0) {
        throw new common_1.BadRequestException('La cantidad debe ser mayor a 0');
    }
    if (direction !== 'IN' && direction !== 'OUT') {
        throw new common_1.BadRequestException('Dirección inválida, debe ser IN o OUT');
    }
    // --- Validar producto existe y está activo ---
    const product = await tx.product.findUnique({
        where: { id: productId },
        select: { id: true, stock: true, is_service: true, is_active: true, name: true },
    });
    if (!product) {
        throw new common_1.BadRequestException('Producto no encontrado');
    }
    if (!product.is_active) {
        throw new common_1.BadRequestException(`El producto "${product.name}" está inactivo`);
    }
    const isService = product.is_service;
    // --- Si tiene inventory_management Y no es servicio: validar bodega y acceso ---
    if (hasInventoryManagement && !isService) {
        if (!storageId) {
            throw new common_1.BadRequestException('storage_id es requerido cuando la empresa tiene manejo de inventario');
        }
        // Bodega existe, activa, almacén activo
        const storage = await tx.storage.findUnique({
            where: { id: storageId },
            select: {
                id: true,
                is_active: true,
                warehouse_id: true,
                warehouse: { select: { is_active: true } },
            },
        });
        if (!storage || !storage.is_active || !storage.warehouse.is_active) {
            throw new common_1.BadRequestException('Bodega no encontrada, inactiva o su almacén está inactivo');
        }
        // Acceso del usuario al almacén (si hay userId)
        if (userId) {
            const access = await tx.warehouseUser.findUnique({
                where: {
                    warehouse_id_tenant_user_id: {
                        warehouse_id: storage.warehouse_id,
                        tenant_user_id: userId,
                    },
                },
            });
            if (!access) {
                throw new common_1.BadRequestException('No tienes acceso a este almacén');
            }
        }
    }
    // --- Calcular cambio ---
    const actualChange = direction === 'IN' ? quantity : -quantity;
    // --- 1. Actualizar Product.stock (servicios no manejan stock físico) ---
    let newProductStockValue;
    if (isService) {
        newProductStockValue = Number(product.stock);
    }
    else {
        const updatedProduct = await tx.product.update({
            where: { id: productId },
            data: { stock: { increment: actualChange } },
            select: { stock: true },
        });
        newProductStockValue = Number(updatedProduct.stock);
    }
    // --- 2. Upsert StorageStock (si aplica) ---
    let newStorageStock = null;
    if (hasInventoryManagement && storageId && !isService) {
        const storageStock = await tx.storageStock.upsert({
            where: { product_id_storage_id: { product_id: productId, storage_id: storageId } },
            update: { stock: { increment: actualChange } },
            create: { product_id: productId, storage_id: storageId, stock: actualChange },
            select: { stock: true },
        });
        newStorageStock = Number(storageStock.stock);
    }
    // --- 3. Crear ProductMovement (kardex) con consecutivo ---
    const consecutive = await (0, get_next_consecutive_1.getNextConsecutive)(tx, 'product_movement');
    const movement = await tx.productMovement.create({
        data: {
            consecutive,
            product_id: productId,
            storage_id: storageId || null,
            type_key: typeKey,
            direction,
            quantity,
            date: date || new Date(),
            reference_id: referenceId || null,
            reference_consecutive: referenceConsecutive || null,
            notes: notes || null,
        },
        select: { id: true, consecutive: true },
    });
    return {
        movementId: movement.id,
        consecutive: movement.consecutive,
        newProductStock: newProductStockValue,
        newStorageStock,
    };
}
