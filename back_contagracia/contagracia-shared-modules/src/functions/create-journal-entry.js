"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createJournalEntry = createJournalEntry;
const library_1 = require("@prisma/client-tenant/runtime/library");
const common_1 = require("@nestjs/common");
const get_next_consecutive_1 = require("./get-next-consecutive");
const validate_period_open_1 = require("./validate-period-open");
/**
 * Valida que las cuentas de orden (7*, 8*, 9*) solo se mezclen entre ellas
 */
function validateAccountClasses(items) {
    const orderClasses = ['7', '8', '9'];
    const hasOrderAccounts = items.some(item => orderClasses.includes(item.account_code.charAt(0)));
    const hasRegularAccounts = items.some(item => !orderClasses.includes(item.account_code.charAt(0)));
    if (hasOrderAccounts && hasRegularAccounts) {
        throw new common_1.BadRequestException('Las cuentas de clase 7, 8 y 9 (orden/producción) solo pueden tener movimientos entre ellas mismas');
    }
}
/**
 * Verifica si debe saltar la validación de clases de cuenta
 * - opening_balance: saldos iniciales
 * - reversal de un opening_balance
 */
async function shouldSkipAccountClassValidation(tx, typeKey, referenceId) {
    if (typeKey === 'opening_balance')
        return true;
    if (typeKey === 'reversal' && referenceId) {
        const originalEntry = await tx.journalEntry.findUnique({
            where: { id: referenceId },
            select: { type_key: true },
        });
        if (originalEntry?.type_key === 'opening_balance')
            return true;
    }
    return false;
}
/**
 * Verifica si la fecha puede ser null (asientos de cierre)
 * - period_close: cierres contables
 * - reversal de un period_close
 */
async function canHaveNullDate(tx, typeKey, referenceId) {
    if (typeKey === 'period_close')
        return true;
    if (typeKey === 'reversal' && referenceId) {
        const originalEntry = await tx.journalEntry.findUnique({
            where: { id: referenceId },
            select: { type_key: true },
        });
        if (originalEntry?.type_key === 'period_close')
            return true;
    }
    return false;
}
/**
 * Crea un asiento contable con sus líneas.
 *
 * @param tx - Cliente de transacción Prisma (del caller)
 * @param params - Datos del asiento
 */
async function createJournalEntry(tx, params) {
    // Validar fecha: requerida excepto para period_close o reversal de period_close
    const allowNullDate = await canHaveNullDate(tx, params.type_key, params.reference_id);
    if (!params.date && !allowNullDate) {
        throw new common_1.BadRequestException('La fecha es requerida para este tipo de asiento');
    }
    // Validar que el período contable esté abierto para la fecha del asiento
    // Excepto para period_close o reversal de period_close (mismo criterio que allowNullDate)
    if (!allowNullDate && params.date) {
        await (0, validate_period_open_1.validatePeriodOpen)(tx, params.date);
    }
    const isManual = params.type_key === 'manual';
    // Validar descripción general requerida
    if (!params.description || !params.description.trim()) {
        throw new common_1.BadRequestException('La descripción del asiento es requerida');
    }
    // 1. Validar montos: deben ser > 0 (manuales no permiten 0, ninguno permite negativos)
    for (const item of params.items) {
        if (item.amount < 0) {
            throw new common_1.BadRequestException(`El monto de cada línea debe ser mayor a 0 (cuenta: ${item.account_code})`);
        }
        if (item.amount === 0 && isManual) {
            throw new common_1.BadRequestException(`Los asientos manuales no pueden tener líneas con monto 0 (cuenta: ${item.account_code || 'sin cuenta'})`);
        }
        if (!item.account_code || !item.account_code.trim()) {
            throw new common_1.BadRequestException('Todas las líneas deben tener una cuenta contable');
        }
    }
    const items = params.items.filter(item => item.amount !== 0);
    if (items.length < 2) {
        throw new common_1.BadRequestException('El asiento debe tener al menos 2 líneas con monto');
    }
    // Validar descripción requerida en cada línea
    const itemsWithoutDescription = items.filter(item => !item.description || !item.description.trim());
    if (itemsWithoutDescription.length > 0) {
        throw new common_1.BadRequestException('Todas las líneas del asiento deben tener descripción');
    }
    // 2. Validar que todas las cuentas existan
    const accountCodes = [...new Set(items.map(i => i.account_code))];
    const accounts = await tx.chartOfAccount.findMany({
        where: { code: { in: accountCodes } },
        select: { code: true, name: true },
    });
    const foundAccountCodes = accounts.map(a => a.code);
    const missingAccounts = accountCodes.filter(c => !foundAccountCodes.includes(c));
    if (missingAccounts.length > 0) {
        throw new common_1.BadRequestException(`Cuentas no encontradas: ${missingAccounts.join(', ')}`);
    }
    // 3. Validar terceros si se proporcionan
    const thirdPartyIds = [...new Set(items.map(i => i.third_party_id).filter((id) => !!id))];
    if (thirdPartyIds.length > 0) {
        const thirdParties = await tx.thirdParty.findMany({
            where: { id: { in: thirdPartyIds } },
            select: { id: true },
        });
        const foundIds = thirdParties.map(tp => tp.id);
        const missingIds = thirdPartyIds.filter(id => !foundIds.includes(id));
        if (missingIds.length > 0) {
            throw new common_1.BadRequestException('Uno o más terceros no fueron encontrados');
        }
    }
    // 4, 5, 6. Validar bank_account según cuenta contable
    const bankAccountIds = [...new Set(items.map(i => i.bank_account_id).filter((id) => !!id))];
    let bankAccountsMap = new Map();
    if (bankAccountIds.length > 0) {
        const bankAccounts = await tx.bankAccount.findMany({
            where: { id: { in: bankAccountIds } },
            select: { id: true, account_type: true },
        });
        bankAccounts.forEach(ba => bankAccountsMap.set(ba.id, ba));
        const foundBankIds = bankAccounts.map(ba => ba.id);
        const missingBankIds = bankAccountIds.filter(id => !foundBankIds.includes(id));
        if (missingBankIds.length > 0) {
            throw new common_1.BadRequestException('Una o más cuentas bancarias no fueron encontradas');
        }
    }
    // Validar reglas de cuentas bancarias por cada línea
    // - 1110*/1105* NO requieren bank_account_id, pero si lo tienen debe ser del tipo correcto
    // - Cuentas que no son 1110*/1105* NO pueden tener bank_account_id
    for (const item of items) {
        const accountCode = item.account_code;
        const is1110 = accountCode.startsWith('1110'); // Bancos
        const is1105 = accountCode.startsWith('1105'); // Caja
        if (item.bank_account_id) {
            const bankAccount = bankAccountsMap.get(item.bank_account_id);
            if (is1110) {
                if (bankAccount?.account_type === 'CASH') {
                    throw new common_1.BadRequestException(`La cuenta ${accountCode} (Bancos) no puede usar una cuenta bancaria tipo Caja`);
                }
            }
            else if (is1105) {
                if (bankAccount?.account_type !== 'CASH') {
                    throw new common_1.BadRequestException(`La cuenta ${accountCode} (Caja) solo puede usar cuentas bancarias tipo Caja`);
                }
            }
            else {
                throw new common_1.BadRequestException(`La cuenta ${accountCode} no puede tener cuenta bancaria asociada. Solo cuentas 1110* y 1105* pueden tenerla`);
            }
        }
    }
    // 7. Validar débitos = créditos (precisión 4 decimales)
    const totalDebits = items
        .filter(i => i.type === 'DEBIT')
        .reduce((sum, i) => sum.plus(new library_1.Decimal(i.amount)), new library_1.Decimal(0));
    const totalCredits = items
        .filter(i => i.type === 'CREDIT')
        .reduce((sum, i) => sum.plus(new library_1.Decimal(i.amount)), new library_1.Decimal(0));
    if (!totalDebits.toDecimalPlaces(4).equals(totalCredits.toDecimalPlaces(4))) {
        throw new common_1.BadRequestException(`El asiento no está balanceado. Débitos: ${totalDebits.toFixed(4)}, Créditos: ${totalCredits.toFixed(4)}`);
    }
    // 9. Validar clases de cuenta (7, 8, 9)
    const skipClassValidation = await shouldSkipAccountClassValidation(tx, params.type_key, params.reference_id);
    if (!skipClassValidation) {
        validateAccountClasses(items);
    }
    // Validar que el tipo de asiento exista
    const entryType = await tx.journalEntryType.findUnique({
        where: { key: params.type_key },
    });
    if (!entryType) {
        throw new common_1.BadRequestException(`Tipo de asiento '${params.type_key}' no válido`);
    }
    // Crear asiento con items y consecutivo
    const consecutive = await (0, get_next_consecutive_1.getNextConsecutive)(tx, 'journal_entry');
    const entry = await tx.journalEntry.create({
        data: {
            consecutive,
            date: params.date,
            description: params.description,
            type_key: params.type_key,
            reference_id: params.reference_id,
            items: {
                create: items.map((item) => ({
                    account_code: item.account_code,
                    type: item.type,
                    amount: item.amount,
                    description: item.description,
                    third_party_id: item.third_party_id,
                    bank_account_id: item.bank_account_id,
                    reference_type: item.reference_type || 'NORMAL',
                    reference_id: item.reference_id || null,
                })),
            },
        },
    });
    return {
        id: entry.id,
        consecutive: entry.consecutive,
    };
}
