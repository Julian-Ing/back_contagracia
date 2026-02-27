# Períodos Contables (Cierre Contable)

## Descripción
Módulo completo para gestión de períodos contables anuales y mensuales, incluyendo apertura, cierre, reapertura y validación de operaciones.

## Archivos Creados

### Módulo de Períodos (`accounting-service/src/modules/periods/`)
- `periods.module.ts` - Módulo NestJS
- `periods.controller.ts` - Controlador REST
- `periods.service.ts` - Lógica de negocio
- `dto/` - DTOs de validación:
  - `create-period.dto.ts`
  - `update-period.dto.ts`
  - `query-period.dto.ts`
  - `create-period-action.dto.ts`
  - `query-period-action.dto.ts`
  - `index.ts`

### Función de Validación (`accounting-service/src/functions/`)
- `validate-period-open.ts` - Valida que el período esté abierto para operaciones contables

## Endpoints API

### Períodos
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/accounting-periods` | Listar períodos con filtros |
| GET | `/accounting-periods/:id` | Obtener período por ID |
| POST | `/accounting-periods` | Crear período |
| PUT | `/accounting-periods/:id` | Actualizar período |
| POST | `/accounting-periods/:id/close` | Cerrar período |
| POST | `/accounting-periods/:id/reopen` | Reabrir período |

### Acciones de Período
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/accounting-periods/:id/actions` | Listar acciones del período |
| POST | `/accounting-periods/:id/actions` | Crear acción manual |

## Query Parameters

### GET `/accounting-periods`
- `search` - Buscar por nombre o consecutivo
- `year` - Filtrar por año
- `status` - Filtrar por estado (OPEN, CLOSED, REOPENED)
- `is_annual` - Filtrar por tipo (true/false)
- `page`, `limit` - Paginación

### GET `/accounting-periods/:id/actions`
- `search` - Buscar por razón
- `action` - Filtrar por tipo (OPEN, CLOSE, REOPEN, ADJUST)
- `from_date`, `to_date` - Filtrar por rango de fechas
- `page`, `limit` - Paginación

## Reglas de Negocio

### Períodos Anuales
1. **Máximo 2 activos**: Solo pueden existir 2 períodos anuales OPEN o REOPENED
2. **Consecutivos**: Los períodos activos deben ser años consecutivos (ej: 2025 y 2026)
3. **Único por año**: No puede haber 2 períodos anuales del mismo año
4. **Cierre automático**: Al cerrar un año, se crea automáticamente el siguiente si no existe

### Períodos Mensuales
1. **Período padre requerido**: Debe tener un período anual como padre
2. **Sin superposición**: No pueden superponerse fechas dentro del mismo año
3. **Herencia de estado**: Si el período anual está cerrado, los mensuales también

### Validación de Operaciones
```typescript
// Lógica de validatePeriodOpen(tenantDb, date)
1. Buscar período ANUAL que contenga la fecha
2. Si no existe → Error: "No existe período anual"
3. Si está CLOSED → Error: "Período cerrado"
4. Buscar período MENSUAL (si existe)
5. Si está CLOSED → Error: "Período mensual cerrado"
6. Si llegamos aquí → Operación permitida
```

## Integración con Otras Funciones

### createJournalEntry
```typescript
// Valida período antes de crear asiento
const skipValidation = ['period_close', 'period_adjustment'].includes(type_key);
if (!skipValidation) {
  await validatePeriodOpen(prisma, params.date);
}
```

### BankAccountsService.create
```typescript
// Valida período antes de crear cuenta bancaria
await validatePeriodOpen(tenantDb, new Date());
```

## Modelo de Datos

### AccountingPeriod
```prisma
model AccountingPeriod {
  id               String   @id @default(uuid())
  consecutive      String   @unique
  name             String
  start_date       DateTime
  end_date         DateTime
  year             Int
  is_annual        Boolean  @default(false)
  parent_period_id String?
  status           PeriodStatus @default(OPEN)
  closed_at        DateTime?
  closed_by        String?
  reopened_at      DateTime?
  reopened_by      String?
  description      String?
}

enum PeriodStatus {
  OPEN
  CLOSED
  REOPENED
}
```

### AccountingPeriodAction
```prisma
model AccountingPeriodAction {
  id               String   @id @default(uuid())
  period_id        String
  action           PeriodActionType
  reason           String?
  journal_entry_id String?
  created_by       String?
  created_at       DateTime @default(now())
}

enum PeriodActionType {
  OPEN
  CLOSE
  REOPEN
  ADJUST
}
```

## Consecutivos
Usa el sistema centralizado `getNextConsecutive(tx, 'accounting_period')` con prefijo `PC-`.

## Notas Importantes
- El `user.sub` del JWT contiene el ID del usuario del tenant (no `user.id`)
- Las acciones registran el usuario que las realiza
- Al reabrir un período anual, se crea acción ADJUST en el siguiente período
