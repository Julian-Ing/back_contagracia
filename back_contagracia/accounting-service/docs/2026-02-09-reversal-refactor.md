# Refactorizacion de Reversiones - 2026-02-09

## Resumen

Refactorizacion completa del sistema de reversiones para:
1. Soportar todos los tipos de asiento (no solo `manual`)
2. Separar creacion de movimientos bancarios del servicio al controller
3. Reutilizar la funcion `reverse()` desde otros servicios

## Cambios en Backend

### 1. journal-entries.service.ts

#### Funcion reverse() - Ahora universal

**Antes:**
- Solo funcionaba para asientos tipo `manual`
- Creaba movimientos bancarios internamente

**Ahora:**
- Funciona para **todos los tipos de asiento**
- **NO crea movimientos bancarios** (eso lo hace el controller)
- Acepta fecha null para reversiones de `period_close`

```typescript
async reverse(
  companyId: string,
  id: string,
  reversalDate?: Date | null  // null para period_close
): Promise<CreateJournalEntryResult>
```

**Proceso:**
1. Lock FOR UPDATE para evitar doble reversion
2. Valida que no este reversado
3. Determina fecha: `reversalDate ?? entry.date` (puede ser null)
4. Obtiene items del asiento original
5. Marca original como `is_reversed = true`
6. Crea asiento de reversion via `createJournalEntry()`

#### Nueva funcion createBankMovementsForReversal()

Crea movimientos bancarios invertidos para una reversion:

```typescript
async createBankMovementsForReversal(
  companyId: string,
  originalEntryId: string,
  reversalDate: Date,
  reversalEntry: CreateJournalEntryResult
): Promise<void>
```

**Proceso:**
1. Obtiene items del asiento ORIGINAL con `bank_account_id`
2. Para cada item:
   - Calcula monto original: DEBIT = +amount, CREDIT = -amount
   - Invierte: `reversedAmount = -originalAmount`
   - Crea movimiento referenciando el asiento de REVERSION

### 2. journal-entries.controller.ts

El controller ahora orquesta ambas operaciones:

```typescript
async reverse(@Request() req, @Param('id') id, @Body() body) {
  const reversalDate = body.date ? new Date(body.date) : new Date();

  // 1. Crear asiento de reversion
  const result = await this.journalEntriesService.reverse(
    req.user.company_id, id, reversalDate
  );

  // 2. Crear movimientos bancarios
  await this.journalEntriesService.createBankMovementsForReversal(
    req.user.company_id, id, reversalDate, result
  );

  return result;
}
```

### 3. periods.service.ts

#### Inyeccion de JournalEntriesService

```typescript
import { forwardRef, Inject } from '@nestjs/common';
import { JournalEntriesService } from '../journal-entries/journal-entries.service';

@Injectable()
export class PeriodsService {
  constructor(
    private readonly tenantContext: TenantContextService,
    @Inject(forwardRef(() => JournalEntriesService))
    private readonly journalEntriesService: JournalEntriesService,
  ) {}
}
```

#### Metodo reopen() refactorizado

**Antes:** Duplicaba la logica de reversion manualmente

**Ahora:** Usa `JournalEntriesService.reverse()`

```typescript
// Reversion de cierre (sin fecha)
if (closeAction?.journal_entry_id) {
  const closingReversal = await this.journalEntriesService.reverse(
    companyId,
    closeAction.journal_entry_id,
    null,  // Sin fecha para period_close
  );
  closingReversalId = closingReversal.id;
}

// Reversion de apertura (con fecha)
if (openAction?.journal_entry_id) {
  const openingEntry = await tenantDb.journalEntry.findUnique({
    where: { id: openAction.journal_entry_id },
    select: { date: true },
  });

  const openingReversal = await this.journalEntriesService.reverse(
    companyId,
    openAction.journal_entry_id,
    openingEntry?.date || new Date(nextYear, 0, 1),
  );
  openingReversalId = openingReversal.id;
}
```

**Nota:** NO llama `createBankMovementsForReversal()` porque los asientos de cierre/apertura no tienen movimientos bancarios.

### 4. periods.module.ts

Agregada dependencia circular con forwardRef:

```typescript
import { Module, forwardRef } from '@nestjs/common';
import { JournalEntriesModule } from '../journal-entries/journal-entries.module';

@Module({
  imports: [forwardRef(() => JournalEntriesModule)],
  controllers: [PeriodsController],
  providers: [PeriodsService],
  exports: [PeriodsService],
})
export class PeriodsModule {}
```

## Arquitectura Final

```
Controller (journal-entries.controller.ts)
  └── reverse endpoint
       ├── journalEntriesService.reverse()           → Crea asiento de reversion
       └── journalEntriesService.createBankMovementsForReversal() → Crea movimientos bancarios

Service (periods.service.ts)
  └── reopen()
       └── journalEntriesService.reverse()           → Solo crea asiento (sin bancos)
```

## Beneficios

1. **Codigo DRY**: La logica de reversion esta en un solo lugar
2. **Flexibilidad**: Otros servicios pueden reversar sin crear movimientos bancarios
3. **Consistencia**: Todas las reversiones pasan por la misma validacion
4. **Mantenibilidad**: Cambios futuros solo en un lugar
