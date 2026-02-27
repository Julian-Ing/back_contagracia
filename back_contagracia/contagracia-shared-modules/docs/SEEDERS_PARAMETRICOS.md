# Seeders de Tablas Paramétricas

## Resumen

Se agregaron 3 nuevas tablas paramétricas al sistema que se seedean automáticamente en Master y se replican a cada Tenant cuando se crea.

## Tablas Agregadas

### 1. ARL Risks (`arl_risks`)
Niveles de riesgo ARL según normatividad colombiana.

| ID | Código | Nombre | Tasa (%) |
|----|--------|--------|----------|
| 1 | I | Riesgo I - Bajo | 0.522 |
| 2 | II | Riesgo II - Medio | 1.044 |
| 3 | III | Riesgo III - Alto | 2.436 |
| 4 | IV | Riesgo IV - Muy Alto | 4.350 |
| 5 | V | Riesgo V - Máximo | 6.960 |

### 2. Sub Type Workers (`sub_type_workers`)
Subtipos de trabajador para PILA según normatividad colombiana.

| ID | Código | Nombre |
|----|--------|--------|
| 1 | 00 | No Aplica |
| 2 | 01 | Dependiente pensionado por vejez activo |
| 3 | 02 | Independiente pensionado por vejez activo |
| 4 | 03 | Cotizante no obligado a cotizar a pensión por edad |
| 5 | 04 | Cotizante con requisitos cumplidos para pensión |
| 6 | 12 | Cotizante indemnización sustitutiva/devolución saldos |
| 7 | 16 | Cotizante régimen exceptuado de pensiones |
| 8 | 18 | Cotizante pensionado con mesada superior a 25 smlmv |
| 9 | 19 | Residente en el exterior afiliado voluntario |
| 10 | 20 | Conductores taxi decreto 1047 de 2014 |
| 11 | 21 | Conductores taxi no aporte pensión dec. 1047 |

### 3. Type Contracts (`type_contracts`)
Tipos de contrato laboral en Colombia.

| ID | Código | Nombre |
|----|--------|--------|
| 1 | 1 | Término Fijo |
| 2 | 2 | Término Indefinido |
| 3 | 3 | Obra o Labor |
| 4 | 4 | Aprendizaje |
| 5 | 5 | Practicas |
| 6 | service_provision | Prestación de servicios |

## Archivos Modificados/Creados

### Schemas
- `prisma/schema-master.prisma` - Agregados modelos: `ArlRisk`, `SubTypeWorker`, `TypeContract`
- `prisma/schema-tenant.prisma` - Corregido `Decimal(5,3)` en `ArlRisk`

### Migraciones
- `prisma/migrations/20260130133134_add_arl_risks/`
- `prisma/migrations/20260130134244_add_sub_type_workers/`
- `prisma/migrations/20260130134914_add_type_contracts/`

### Seeds
- `prisma/seeds/arlRisks.ts` - Datos de riesgos ARL
- `prisma/seeds/subTypeWorkers.ts` - Datos de subtipos de trabajador
- `prisma/seeds/typeContracts.ts` - Datos de tipos de contrato
- `prisma/seeds/seed-catalogs.ts` - Modificado para incluir los 3 nuevos seeders

### Scripts
- `prisma/scripts/seed-all-tenants.ts` - Modificado para replicar las 3 tablas a tenants existentes

## Comandos

### Ejecutar seed en Master
```bash
cd contagracia-shared-modules
pnpm prisma:seed
```

### Ejecutar seed en todos los Tenants existentes
```bash
cd contagracia-shared-modules
npx ts-node prisma/scripts/seed-all-tenants.ts --force
```

## Flujo Automático

Cuando se crea un nuevo Tenant:
1. Se ejecuta `replicateParametrics()` en `tenant.service.ts`
2. Se copian automáticamente las 3 tablas desde Master al Tenant
3. Todos los registros tienen `is_active = true`
