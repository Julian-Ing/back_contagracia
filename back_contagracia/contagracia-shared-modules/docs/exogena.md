# Exogena - Reportes DIAN

## Descripcion

Sistema para generar reportes de informacion exogena requeridos por la DIAN. Cada empresa configura los formatos que utiliza y mapea los conceptos a sus cuentas contables.

## Tablas

### company_exogenous_formats

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | uuid | PK |
| year | int | año gravable (2024, 2025...) |
| code | varchar | codigo formato DIAN (1001, 1003...) |
| name | text | nombre del formato |
| created_at | timestamp | |
| updated_at | timestamp | |
| UNIQUE(year, code) | | |

### company_exogenous_concepts

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | uuid | PK |
| company_exogenous_format_id | uuid FK | → company_exogenous_formats.id |
| code | varchar | codigo concepto (5001, 5002...) |
| name | text | descripcion del concepto |
| account_id_1 | uuid FK? | → chart_of_accounts.id (cuenta 1) |
| account_code_1 | varchar | denormalized |
| account_name_1 | text | denormalized |
| account_id_2 | uuid FK? | → chart_of_accounts.id (cuenta 2) |
| account_code_2 | varchar | denormalized |
| account_name_2 | text | denormalized |
| created_at | timestamp | |
| updated_at | timestamp | |
| UNIQUE(company_exogenous_format_id, code) | | |

### exogenous_files

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | uuid | PK |
| format_code | varchar | 1001, 1003... |
| format_name | varchar | nombre del formato |
| format_year | int | año gravable |
| consecutive | int | NumEnvio (1, 2, 3...) |
| file_name | varchar | EX-001-1001-2024.xml |
| file_path | text | exogenous/2024/1001/... |
| file_size | bigint | bytes |
| total_entries | int | registros en XML |
| status | enum | PROCESSING, COMPLETED, FAILED |
| error_message | text? | mensaje si fallo |
| created_at | timestamp | |
| completed_at | timestamp? | |
| UNIQUE(format_year, format_code, consecutive) | | |

## Formatos DIAN (10)

| Codigo | Nombre | Conceptos |
|--------|--------|-----------|
| 1001 | Pagos o abonos en cuenta y retenciones practicadas | 79 |
| 1003 | Retenciones en la fuente que le practicaron | 15 |
| 1005 | Impuesto a las ventas por pagar - Descontable | 0 |
| 1006 | Impuestos a las ventas por pagar (generado) e INC | 0 |
| 1007 | Ingresos recibidos | 20 |
| 1008 | Saldos de cuentas por cobrar al 31 de diciembre | 4 |
| 1009 | Saldos de cuentas por pagar al 31 de diciembre | 15 |
| 1011 | Informacion de las declaraciones tributarias | 222 |
| 1012 | Informacion de declaraciones tributarias, acciones, inversiones | 9 |
| 2276 | Informacion de rentas de trabajo y pensiones | 0 |

**Total: 364 conceptos**

## Flujo de Uso

1. Al crear tenant, el seeder inserta formatos y conceptos del año actual
2. Usuario mapea conceptos a sus cuentas contables (account_id_1, account_id_2)
3. Usuario genera reporte → crea registro en exogenous_files (status=PROCESSING)
4. Sistema genera XML segun especificaciones DIAN
5. XML se guarda en storage/exogenous/{year}/{format_code}/
6. Se actualiza exogenous_files (status=COMPLETED, file_path, file_size)
7. Usuario descarga archivo via endpoint GET /api/exogenous/download/:id

## Archivos

- `prisma/schema-tenant.prisma` - Modelos Prisma
- `prisma/seeds/exogenousFormats.ts` - 10 formatos DIAN
- `prisma/seeds/exogenousConcepts.ts` - 364 conceptos (generado desde Supabase)
- `prisma/scripts/seed-all-tenants.ts` - Logica de seeding
- `docs/exogena.md` - Esta documentacion

## Actualizacion Anual

Cuando la DIAN publique cambios para un nuevo año:

1. Actualizar `exogenousFormats.ts` si hay nuevos formatos
2. Regenerar `exogenousConcepts.ts` desde la fuente oficial
3. Ejecutar `npx ts-node prisma/scripts/seed-all-tenants.ts --force`

El seeder usa el año actual (`new Date().getFullYear()`) para crear los formatos.

## Estado

IMPLEMENTADO - Modelos creados, seeders funcionando, migraciones aplicadas.
