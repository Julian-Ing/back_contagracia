# ArAp: Detalle con paginacion, busqueda fuzzy, filtros de estado y vencimiento - 2026-02-11

## Archivos modificados

- `accounting-service/src/modules/ar-ap/ar-ap.controller.ts`
- `accounting-service/src/modules/ar-ap/ar-ap.service.ts`

---

## 1. Endpoint getThirdPartyDetail — Parametros nuevos

**Ruta:** `GET /ar-ap/third-party/:terceroId/detail`

### Query params agregados
| Param | Tipo | Descripcion |
|-------|------|-------------|
| `page` | number | Pagina actual (default 1) |
| `limit` | number | Registros por pagina (default 10) |
| `statuses` | string | Comma-separated: PENDING,PARTIAL,PAID |
| `overdue` | string | 'all' \| 'overdue' \| 'current' |

### Controller
Parsea `statuses` de string comma-separated a array, valida contra `['PENDING', 'PARTIAL', 'PAID']`.

---

## 2. Servicio — getThirdPartyDetail

### ThirdPartyDetailParams
```typescript
interface ThirdPartyDetailParams {
  type: ArApType;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  page?: number;
  limit?: number;
  statuses?: ArApStatus[];
  overdue?: 'all' | 'overdue' | 'current';
}
```

### Filtro de estados
- Si `statuses` tiene valores: `{ status: { in: statuses } }`
- Si no: `{ status: { not: 'VOIDED' } }` (excluye anulados)

### Filtro de vencimiento
- `overdue = 'overdue'`: due_date < hoy
- `overdue = 'current'`: due_date >= hoy OR due_date es null
- `overdue = 'all'`: sin filtro adicional

### Busqueda fuzzy
Usa `$queryRaw` con `word_similarity()` (pg_trgm) y `ILIKE` sobre la tabla `"ar_ap"`:
```sql
SELECT a."id" FROM "ar_ap" a
WHERE a."third_party_id" = $1
AND (
  a."consecutive" ILIKE $2
  OR a."source_number" ILIKE $2
  OR COALESCE(a."description", '') ILIKE $2
  OR word_similarity($3, COALESCE(a."consecutive", '')) > 0.3
  OR word_similarity($3, COALESCE(a."source_number", '')) > 0.3
  OR word_similarity($3, COALESCE(a."description", '')) > 0.3
)
```

### Paginacion
- `skip: (page - 1) * limit`, `take: limit`
- `Promise.all([findMany, count])` para datos + total
- Retorna `txTotal`, `txPage`, `txTotalPages`

### Campo days_due
```typescript
days_due: dueMs ? Math.floor((dueMs - todayMs) / 86400000) : 0
```
Positivo = dias hasta vencimiento, negativo = dias vencido, 0 = hoy o sin fecha.

### Campo description
Agregado `description: r.description || null` al mapeo de transacciones.

---

## 3. Endpoint getSummaryByThirdParty — Campos nuevos

### Campos agregados al response
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `total_docs` | number | Total de documentos del tercero (no VOIDED) |
| `paid_docs` | number | Documentos con status PAID |

Conteo:
```typescript
g.total_docs += 1;
if (r.status === ArApStatus.PENDING || r.status === ArApStatus.PARTIAL) {
  g.pending_docs += 1;
}
if (r.status === ArApStatus.PAID) {
  g.paid_docs += 1;
}
```

---

## Nota: Nombre de tabla

La tabla en PostgreSQL es `"ar_ap"` (definida con `@@map("ar_ap")` en Prisma schema). Las raw queries deben usar este nombre, NO `"ar_aps"`.
