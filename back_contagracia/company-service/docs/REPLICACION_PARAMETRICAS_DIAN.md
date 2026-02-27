# Replicación de Tablas Paramétricas DIAN y Nómina

## Resumen

Se actualizó el método `replicateParametrics()` en `tenant.service.ts` para incluir 7 nuevas tablas paramétricas relacionadas con facturación electrónica DIAN, eventos RADIAN, nómina electrónica y obligaciones tributarias.

## Tablas Replicadas (Nuevas)

| Tabla | Descripción | Registros |
|-------|-------------|-----------|
| `events` | Eventos RADIAN (030, 031, 032, etc.) | 7 |
| `type_documents` | Tipos documento DIAN (01, 02, 91, 92, 102, etc.) | 26 |
| `type_workers` | Tipos de trabajador nómina electrónica | 16 |
| `type_rejections` | Motivos de rechazo DIAN | 4 |
| `type_payroll_adjust_notes` | Tipos nota ajuste nómina | 2 |
| `worker_subtype_rules` | Reglas aportes por subtipo trabajador | 10 |
| `tax_obligation_types` | Tipos obligaciones tributarias | 23 |

## Archivo Modificado

`src/modules/tenant/tenant.service.ts`

### Cambios en `replicateParametrics()`

1. **Nuevas consultas a Master:**
```typescript
this.prisma.event.findMany(),
this.prisma.typeDocument.findMany(),
this.prisma.typeWorker.findMany(),
this.prisma.typeRejection.findMany(),
this.prisma.typePayrollAdjustNote.findMany(),
this.prisma.workerSubtypeRule.findMany(),
this.prisma.taxObligationType.findMany(),
```

2. **Nuevos upserts en Tenant:**
- Cada tabla se replica usando `tenantPrisma.[model].upsert()`
- Se preservan los IDs originales de Master
- Se usa `update: {}` para evitar sobrescribir datos existentes

## Flujo de Replicación

Cuando se crea un nuevo Tenant:
1. Se ejecuta `provisionTenantDatabase()` - Crea la BD y aplica migraciones
2. Se ejecuta `replicateParametrics()` - Copia todas las tablas paramétricas desde Master
3. Se ejecuta `createOwnerTenantUser()` - Crea el usuario owner

## Logs

El método genera logs detallados:
```
[PARAMETRICS] Datos obtenidos de Master:
[PARAMETRICS]   - Eventos RADIAN: 7
[PARAMETRICS]   - Tipos de Documento DIAN: 26
[PARAMETRICS]   - Tipos Trabajador: 16
[PARAMETRICS]   - Tipos de Rechazo DIAN: 4
[PARAMETRICS]   - Tipos Nota Ajuste Nómina: 2
[PARAMETRICS]   - Reglas Subtipo Trabajador: 10
[PARAMETRICS]   - Tipos Obligación Tributaria: 23
[PARAMETRICS] ✓ Tablas paramétricas replicadas exitosamente
```

## Dependencias

Requiere que `contagracia-shared-modules` tenga:
- Modelos definidos en `schema-master.prisma` y `schema-tenant.prisma`
- Datos seeded en Master (`prisma db seed`)
