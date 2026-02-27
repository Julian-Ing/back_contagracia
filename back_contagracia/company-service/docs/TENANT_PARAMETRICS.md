# Replicación de Paramétricas a Tenants

## Resumen

Se actualizó el servicio `TenantService` para replicar 3 nuevas tablas paramétricas cuando se crea un nuevo Tenant.

## Tablas Agregadas a la Replicación

1. **ARL Risks** (`arl_risks`) - 5 niveles de riesgo ARL
2. **Sub Type Workers** (`sub_type_workers`) - 11 subtipos de trabajador PILA
3. **Type Contracts** (`type_contracts`) - 6 tipos de contrato laboral

## Archivo Modificado

### `src/modules/tenant/tenant.service.ts`

#### Cambios en `replicateParametrics()`

1. **Obtención de datos desde Master** (Promise.all):
```typescript
arlRisks,
subTypeWorkers,
typeContracts,
// ...
this.prisma.arlRisk.findMany(),
this.prisma.subTypeWorker.findMany(),
this.prisma.typeContract.findMany(),
```

2. **Logging de conteos**:
```typescript
this.logger.log(`[PARAMETRICS]   - Riesgos ARL: ${arlRisks.length}`);
this.logger.log(`[PARAMETRICS]   - Subtipos Trabajador: ${subTypeWorkers.length}`);
this.logger.log(`[PARAMETRICS]   - Tipos de Contrato: ${typeContracts.length}`);
```

3. **Inserción en Tenant** (dentro de $transaction):
```typescript
// ARL Risks
...arlRisks.map((a) =>
  tenantPrisma.arlRisk.upsert({
    where: { id: a.id },
    create: { id: a.id, code: a.code, name: a.name, rate: a.rate, is_active: a.is_active },
    update: {},
  }),
),
// Sub Type Workers
...subTypeWorkers.map((s) =>
  tenantPrisma.subTypeWorker.upsert({
    where: { id: s.id },
    create: { id: s.id, code: s.code, name: s.name, is_active: s.is_active },
    update: {},
  }),
),
// Type Contracts
...typeContracts.map((t) =>
  tenantPrisma.typeContract.upsert({
    where: { id: t.id },
    create: { id: t.id, code: t.code, name: t.name, is_active: t.is_active },
    update: {},
  }),
),
```

## Total de Tablas Paramétricas Replicadas

| # | Tabla | Registros |
|---|-------|-----------|
| 1 | Departments | 33 |
| 2 | Municipalities | 1,122 |
| 3 | Type Document Identifications | 12 |
| 4 | Type Organizations | 2 |
| 5 | Type Regimes | 2 |
| 6 | Type Liabilities | 5 |
| 7 | Banks | 32 |
| 8 | Payment Methods | 75 |
| 9 | Product Units | 10 |
| 10 | Tax Types | 21 |
| 11 | Tax Rates | 6 |
| 12 | **ARL Risks** | **5** |
| 13 | **Sub Type Workers** | **11** |
| 14 | **Type Contracts** | **6** |

**Total: 14 tablas paramétricas**
