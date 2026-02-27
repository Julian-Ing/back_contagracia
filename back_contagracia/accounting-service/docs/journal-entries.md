# Journal Entries Module

## Descripcion

Modulo para gestionar asientos contables del tenant.

## Ubicacion

- Modulo: `accounting-service/src/modules/journal-entries/`
- Funcion: `accounting-service/src/functions/create-journal-entry.ts`

## Archivos

- `journal-entries.module.ts` - Modulo NestJS
- `journal-entries.controller.ts` - Controlador REST
- `journal-entries.service.ts` - Servicio con logica de negocio
- `create-journal-entry.ts` - Funcion centralizada de creacion

## Endpoints

| Metodo | Endpoint                      | Descripcion                    | Permiso                     |
| ------ | ----------------------------- | ------------------------------ | --------------------------- |
| GET    | `/journal-entries`            | Listar asientos con paginacion | `journal_entries.view`      |
| GET    | `/journal-entries/types`      | Listar tipos de asientos       | `journal_entries.view`      |
| GET    | `/journal-entries/:id`        | Obtener asiento por ID         | `journal_entries.view_detail` |
| POST   | `/journal-entries`            | Crear asiento contable         | `journal_entries.create`    |
| POST   | `/journal-entries/:id/reverse`| Reversar asiento manual        | `journal_entries.reverse`   |
| POST   | `/journal-entries/:id/duplicate`| Duplicar asiento             | `journal_entries.duplicate` |

## Redireccion post-accion (Frontend)

Al crear, duplicar o reversar un asiento, el frontend redirige al detalle del nuevo asiento si el usuario tiene `journal_entries.view_detail`. Si no, redirige al listado general.

- **Crear** (`new/page.tsx`): `can('journal_entries.view_detail')` → detalle, si no → listado
- **Duplicar/Reversar** (`JournalEntryDetail.tsx`): ya esta en detalle, navega al nuevo asiento directamente

## Query Parameters (GET /journal-entries)

- `search`: Busqueda por consecutivo o descripcion
- `type_key`: Filtrar por tipo de asiento (manual, invoice, reversal, etc.)
- `from_date`: Fecha desde (YYYY-MM-DD)
- `to_date`: Fecha hasta (YYYY-MM-DD)
- `page`: Numero de pagina (default: 1)
- `limit`: Limite por pagina (default: 50)

## Logica de Listado

### Reversiones en el listado

Las reversiones **nunca aparecen como filas separadas** en el listado principal. Siempre se muestran como propiedad `reversal_entry` del asiento original.

**Logica del query:**

1. Se excluyen asientos con `type_key = 'reversal'` del resultado principal
2. Si un filtro (busqueda, fecha, tipo) coincide con una reversion, se trae su asiento original
3. Para asientos con `is_reversed = true`, se adjunta `reversal_entry` con datos del asiento de reversion

**Filtro por tipo "reversal":**
- No busca asientos de tipo reversal directamente
- Busca asientos que tienen `is_reversed = true` (asientos que fueron reversados)

**Estructura de respuesta:**

```typescript
{
  data: [
    {
      id: string,
      consecutive: string,           // Ej: "JE-0002"
      date: string,
      description: string | null,
      type_key: string,
      type_description: string,
      type_color: string,
      is_reversed: boolean,
      reversal_entry: {              // Solo si is_reversed = true
        id: string,
        consecutive: string,         // Ej: "JE-0004"
        date: string,
        description: string,
        type_key: string,
        type_description: string,
        type_color: string,
        total_debit: number,
        total_credit: number,
      } | null,
      items: [...],
      total_debit: number,
      total_credit: number,
      created_at: string,
    }
  ],
  total: number,
  page: number,
  limit: number,
  totalPages: number,
  hasMore: boolean,
}
```

## Detalle de Asiento (GET /:id)

Ademas de los datos del asiento y sus items, incluye:

- `reversal_entry`: Si `is_reversed = true`, datos del asiento de reversion
- `original_entry`: Si `type_key = 'reversal'`, datos del asiento original reversado

```typescript
{
  ...entry,
  reversal_entry: { id: string, consecutive: string } | null,
  original_entry: { id: string, consecutive: string } | null,
}
```

## Reversar Asiento (POST /:id/reverse)

### Requisitos

- Solo asientos de tipo `manual`
- El asiento no debe estar ya reversado (`is_reversed = false`)
- El periodo contable debe estar abierto para la fecha de reversion

### Body

```typescript
{
  date?: string  // Fecha del asiento de reversion (YYYY-MM-DD), default: hoy
}
```

### Proceso

1. **Lock FOR UPDATE** para evitar doble reversion concurrente
2. Valida que el periodo este abierto para la fecha de reversion
3. Valida que sea tipo `manual` y no este reversado
4. Marca el asiento original como `is_reversed = true`
5. Crea asiento de reversion tipo `reversal` con:
   - `reference_id` apuntando al asiento original
   - Items con tipos invertidos (DEBIT -> CREDIT, CREDIT -> DEBIT)
   - Descripcion: "Reversion de [descripcion original]"
6. Crea movimientos bancarios para items con `bank_account_id`

### Respuesta

```typescript
{
  id: string,          // ID del asiento de reversion
  consecutive: string  // Consecutivo del asiento de reversion
}
```

### Errores

| Codigo | Mensaje |
| ------ | ------- |
| 400    | Solo se pueden reversar asientos manuales |
| 404    | Asiento contable no encontrado |
| 409    | El asiento ya fue reversado |

## Duplicar Asiento (POST /:id/duplicate)

### Body

```typescript
{
  date?: string  // Fecha del asiento duplicado (YYYY-MM-DD), default: hoy
}
```

### Proceso

1. Valida que el periodo este abierto para la fecha del duplicado
2. Crea nuevo asiento tipo `manual` con:
   - Mismos items (cuenta, tipo, monto, tercero, banco)
   - Misma descripcion
3. Crea movimientos bancarios para items con `bank_account_id`

### Respuesta

```typescript
{
  id: string,          // ID del asiento duplicado
  consecutive: string  // Consecutivo del asiento duplicado
}
```

## Funcion createJournalEntry

### Parametros

```typescript
interface CreateJournalEntryParams {
  date: Date;
  description?: string;
  type_key: string;           // Tipo de asiento (65 tipos disponibles)
  reference_id?: string;      // Referencia a documento origen
  items: JournalEntryItemInput[];
}

interface JournalEntryItemInput {
  account_code: string;       // Codigo de cuenta contable
  amount: number;             // Monto (siempre positivo)
  type: 'DEBIT' | 'CREDIT';   // Tipo de movimiento
  description?: string;       // Descripcion de la linea
  third_party_id?: string;    // Tercero asociado
  bank_account_id?: string;   // Cuenta bancaria (solo 1110* o 1105*)
}
```

### Validaciones

1. **Lineas con amount = 0**:
   - Tipo `manual`: Error
   - Otros tipos: Se filtran automaticamente

2. **Minimo 2 lineas** con monto valido

3. **Cuentas contables** deben existir

4. **Terceros** deben existir (si se proporcionan)

5. **Cuenta 1110* (Bancos)**:
   - Requiere `bank_account_id`
   - El bank_account NO puede ser tipo CASH

6. **Cuenta 1105* (Caja)**:
   - Requiere `bank_account_id`
   - El bank_account DEBE ser tipo CASH

7. **Otras cuentas**:
   - NO pueden tener `bank_account_id`

8. **Balance**: Total Debitos = Total Creditos

9. **Clases de cuenta 7, 8, 9**:
   - Solo pueden mezclarse entre ellas
   - Excepcion: `opening_balance` y sus reversiones

10. **CXC_PAID / CXP_PAID**: documento debe existir, no estar pagado/anulado, tercero debe coincidir
    - La validacion de saldo NO se hace aqui — se delega a `create-payment` (con lock FOR UPDATE y deteccion de redondeo)

11. **PREP_USED**: anticipo debe existir, estar activo, tercero debe coincidir
    - La validacion de saldo NO se hace aqui — se delega a `create-prepayment-movement` (con lock FOR UPDATE y deteccion de redondeo)

### Retorno

```typescript
interface CreateJournalEntryResult {
  id: string;         // UUID del asiento
  consecutive: string; // Consecutivo generado (ej: MAN-000001)
}
```

## Redondeo por display_decimals (asientos manuales)

Cuando un asiento manual tiene lineas `CXC_PAID`, `CXP_PAID` o `PREP_USED`, el servicio detecta si el monto del usuario corresponde al saldo redondeado del documento/anticipo y ajusta automaticamente.

### Flujo

1. Lee `display_decimals` de `CompanySetting` (category: `general`, key: `display_decimals`)
2. Para cada linea `CXC_PAID` / `CXP_PAID`: lock ArAp `FOR UPDATE`, compara monto usuario vs saldo real
3. Para cada linea `PREP_USED`: lock Prepayment `FOR UPDATE`, compara monto usuario vs saldo real
4. Si `monto_usuario == round(saldo_real, display_decimals)` y `monto_usuario != saldo_real`:
   - Ajusta `item.amount` al saldo real (para que el pago cierre el documento)
   - Calcula diferencia y clasifica como ingreso o gasto segun tipo activo/pasivo
5. Agrega lineas de ajuste al asiento:
   - `finance_rounding_income` (CREDIT) para diferencias que representan ingreso
   - `finance_rounding_expense` (DEBIT) para diferencias que representan gasto

### Clasificacion activo/pasivo

| Tipo | isAsset | diff > 0 (paga mas) | diff < 0 (paga menos) |
|------|---------|--------------------|-----------------------|
| CxC (RECEIVABLE) | true | Ingreso (421095) | Gasto (530595) |
| CxP (PAYABLE) | false | Gasto (530595) | Ingreso (421095) |
| Antic. Cliente | false | Gasto (530595) | Ingreso (421095) |
| Antic. Proveedor/Empleado | true | Ingreso (421095) | Gasto (530595) |

### Cuentas configurables

Las cuentas de ajuste se leen de `AccountingConfig`:
- `finance_rounding_income` → ej: 421095
- `finance_rounding_expense` → ej: 530595

## PaymentReceipt MANUAL (desde asientos manuales)

Cuando un asiento manual tiene lineas no-NORMAL (`CXC_CREATED`, `CXP_CREATED`, `CXC_PAID`, `CXP_PAID`, `PREP_USED`), se crea un `PaymentReceipt` tipo `MANUAL` para soportar la reversion.

### Lineas del receipt

El receipt incluye **TODAS** las lineas del asiento (no solo las no-NORMAL), asignando `kind` segun el `reference_type`:

| reference_type | kind |
|---------------|------|
| `CXC_PAID` / `CXP_PAID` | `DOC` |
| `PREP_USED` | `PREP_USED` |
| `CXC_CREATED` | `CXC_CREATED` |
| `CXP_CREATED` | `CXP_CREATED` |
| `NORMAL` (o sin ref) | `ACCOUNT` |

Incluir todas las lineas garantiza que el receipt este balanceado (DB = CR) y sea reversable.

### Orden de ejecucion

```
1. Crear ArAp para lineas CXC_CREATED / CXP_CREATED
2. Detectar redondeo en CXC_PAID / CXP_PAID / PREP_USED
3. Agregar lineas de ajuste por redondeo (si aplica)
4. createJournalEntry(tx, ...) con items ajustados
5. Crear PaymentReceipt MANUAL con TODAS las lineas
6. Crear Payment por cada CXC_PAID / CXP_PAID
7. Crear PrepaymentMovement por cada PREP_USED
```

## Movimientos Bancarios

La creacion de movimientos bancarios esta **desacoplada** de `createJournalEntry`.

El servicio `JournalEntriesService` crea los movimientos bancarios despues de crear el asiento usando `createBankMovementsForItems`:

- **Cada linea con `bank_account_id`** genera su propio movimiento (no se consolidan)
- DEBIT en cuentas de activo (1110*, 1105*) = ingreso (+)
- CREDIT en cuentas de activo = egreso (-)

## Tipos de Asiento (type_key)

Los 65 tipos estan definidos en `seed-journal-entry-types.ts`. Algunos comunes:

| type_key | Descripcion |
| -------- | ----------- |
| `manual` | Asiento manual |
| `invoice` | Factura de venta |
| `purchase` | Compra |
| `expense` | Gasto |
| `reversal` | Reversion |
| `opening_balance` | Saldos iniciales |
| `bank_adjustment` | Ajuste bancario |

## Permisos

| Permiso | Descripcion |
| ------- | ----------- |
| `journal_entries.view` | Ver lista de asientos |
| `journal_entries.view_detail` | Ver detalle de asiento |
| `journal_entries.create` | Crear asiento |
| `journal_entries.reverse` | Reversar asiento manual |
| `journal_entries.duplicate` | Duplicar asiento |

## Modelo (Prisma)

```prisma
model JournalEntry {
  id           String   @id @default(uuid())
  consecutive  String?
  date         DateTime @db.Date
  description  String?
  type_key     String
  reference_id String?            // Para reversiones: ID del asiento original
  is_reversed  Boolean  @default(false)
  created_at   DateTime @default(now())

  type  JournalEntryType @relation(...)
  items JournalEntryItem[]
}

model JournalEntryItem {
  id               String  @id @default(uuid())
  journal_entry_id String
  account_code     String
  type             JournalEntryItemType // DEBIT | CREDIT
  amount           Decimal
  description      String?
  third_party_id   String?
  bank_account_id  String?
}
```

## Exportacion PDF (Frontend)

### Componente reutilizable: ExportButtons

**Archivo:** `front_contagracia/src/shared/components/ui/export-buttons.tsx`

Componente que muestra botones de exportacion PDF y Excel. Props:

| Prop | Tipo | Descripcion |
|------|------|-------------|
| `onExportPdf` | `() => void` | Callback para exportar PDF |
| `onExportExcel` | `() => void` | Callback para exportar Excel (sin funcionalidad aun) |
| `permission` | `string` | Permiso requerido para mostrar los botones |
| `loadingPdf` | `boolean` | Estado de carga del PDF |
| `loadingExcel` | `boolean` | Estado de carga del Excel |

Si no se pasa `onExportExcel`, el boton Excel aparece deshabilitado.

### Generador PDF: generateJournalEntryPdf

**Archivo:** `front_contagracia/src/modules/accounting/utils/generateJournalEntryPdf.ts`

Genera un PDF del detalle del asiento contable usando `jsPDF` + `jspdf-autotable`. Incluye:

- Header: logo empresa, nombre, NIT
- Titulo: consecutivo del asiento
- Info: fecha, tipo, estado, descripcion
- Tabla: Cuenta, Tercero, Banco/Caja, Descripcion, Debito, Credito
- Fila de totales
- Footer con numero de pagina

Los montos se formatean con `formatCurrencyCO` respetando `displayDecimals` del tenant.

### Permiso requerido

`journal_entries.export` (ID 253 en seeder) — controla la visibilidad de los botones de exportacion en el detalle del asiento.
