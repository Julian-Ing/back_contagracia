import { JournalEntryItemType, JournalEntryItemRefType } from '@prisma/client-tenant';
export interface JournalEntryItemInput {
    account_code: string;
    amount: number;
    type: JournalEntryItemType;
    description?: string;
    third_party_id?: string;
    bank_account_id?: string;
    reference_type?: JournalEntryItemRefType;
    reference_id?: string;
}
export interface CreateJournalEntryParams {
    date?: Date;
    description?: string;
    type_key: string;
    reference_id?: string;
    items: JournalEntryItemInput[];
}
export interface CreateJournalEntryResult {
    id: string;
    consecutive: string;
}
/**
 * Crea un asiento contable con sus líneas.
 *
 * @param tx - Cliente de transacción Prisma (del caller)
 * @param params - Datos del asiento
 */
export declare function createJournalEntry(tx: any, params: CreateJournalEntryParams): Promise<CreateJournalEntryResult>;
