# Fix Errores TypeScript en Modulos de Contabilidad

## Resumen

Se corrigieron 5 errores TypeScript preexistentes en los modulos de contabilidad.

## Errores corregidos

### 1. ReversalEntry — campos faltantes

**Archivo:** `src/modules/accounting/types/journalEntries.ts`

Se agregaron `total_debit: number` y `total_credit: number` a la interfaz `ReversalEntry`. Faltaban y `JournalEntriesList.tsx` los usaba en lineas 301 y 306.

### 2. CreatePaymentReceiptLinePayload.kind — tipos faltantes

**Archivo:** `src/modules/ar-ap/services/paymentReceipts.service.ts`

Se agrego `'CXC_CREATED' | 'CXP_CREATED'` al tipo union de `kind`. `PaymentReceiptForm.tsx` enviaba estos valores en lineas 488 y 520.

### 3. JournalEntryDetail item.amount — tipo incorrecto

**Archivo:** `src/modules/accounting/components/JournalEntryDetail.tsx`

Se cambio `amount: string | number` a `amount: number` en la interfaz local `JournalEntryItem`. El backend siempre retorna number.

### 4. PeriodFormModal.onSubmit — tipo de retorno

**Archivo:** `src/modules/accounting/components/PeriodFormModal.tsx`

Se cambio `onSubmit: (data: CreatePeriodData) => Promise<void>` a `Promise<unknown>`. El padre (`AccountingPeriodsList.tsx`) retorna `Promise<AccountingPeriod>`, no `Promise<void>`.

### 5. third-party-select.tsx — X icon props

**Archivo:** `src/shared/components/ui/third-party-select.tsx`

El icono Lucide `X` recibia `onClick` y `title` como props directas, pero Lucide icons no aceptan estos props en TS strict mode. Se envolvio en `<span role="button" onClick={...} title="...">`.

## Resultado

0 errores TypeScript en modulos de contabilidad (accounting, ar-ap, banking, prepayments, taxes).
