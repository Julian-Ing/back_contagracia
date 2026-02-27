# Tablas Paramétricas DIAN y Nómina Electrónica

## Resumen

Se agregaron 7 nuevas tablas paramétricas al sistema relacionadas con facturación electrónica DIAN, eventos RADIAN, nómina electrónica y obligaciones tributarias. Estas tablas se seedean automáticamente en Master y se replican a cada Tenant.

## Tablas Agregadas

### 1. Events (`events`) - Eventos RADIAN
Eventos de recepción de documentos electrónicos según normatividad DIAN.

| Código | Nombre |
|--------|--------|
| 030 | Acuse de recibo de Factura Electrónica de Venta |
| 031 | Reclamo de la Factura Electrónica de Venta |
| 032 | Recibo del bien y/o prestación del servicio |
| 033 | Aceptación expresa |
| 034 | Aceptación Tácita |
| 02 | Rechazo Factura Electrónica |
| 04 | Documento Electrónico Recibido |

**Total: 7 registros**

### 2. Type Documents (`type_documents`) - Tipos de Documento DIAN
Tipos de documento electrónico según normatividad DIAN.

| Código | Nombre | Algoritmo CUFE |
|--------|--------|----------------|
| 01 | Factura de Venta Nacional | CUFE-SHA384 |
| 02 | Factura de Exportación | CUFE-SHA384 |
| 03 | Documento Electrónico de Transmisión (tipo 03) | CUFE-SHA384 |
| 04 | Factura de Venta tipo 04 | CUFE-SHA384 |
| 05 | Documento Soporte | CUDS-SHA384 |
| 91 | Nota Crédito | CUDE-SHA384 |
| 92 | Nota Débito | CUDE-SHA384 |
| 95 | Nota de Ajuste Documento Soporte | CUDE-SHA384 |
| 102 | Nómina Individual | CUNE-SHA384 |
| 103 | Nómina Individual de Ajuste | CUNE-SHA384 |
| ... | (26 tipos en total) | ... |

**Total: 26 registros**

### 3. Type Workers (`type_workers`) - Tipos de Trabajador
Tipos de trabajador según nómina electrónica DIAN.

| Código | Nombre |
|--------|--------|
| 01 | Trabajador dependiente |
| 02 | Trabajador servicio doméstico |
| 04 | Madre comunitaria / FAMI |
| 12 | Aprendiz del SENA |
| 19 | Aprendiz |
| 21 | Estudiante pasante |
| 22 | Profesor catedrático |
| 23 | Personal de emergencia |
| 30 | Dependiente de entidad beneficio tipo IV |
| 31 | Cooperado vinculado por CTAs |
| 32 | Afiliado partícipe |
| 33 | Dependiente art. 126 Decreto 019/2012 |
| 34 | Dependiente entidad promotora salud |
| 51 | Trabajador independiente |
| 52 | Independiente voluntario |
| 55 | Afiliado voluntario al Sistema General de Pensiones |

**Total: 16 registros**

### 4. Type Rejections (`type_rejections`) - Tipos de Rechazo DIAN
Motivos de rechazo de documentos electrónicos.

| Código | Nombre |
|--------|--------|
| 01 | Documento con inconsistencias |
| 02 | Mercancía no entregada totalmente |
| 03 | Mercancía no entregada parcialmente |
| 04 | Servicio no prestado |

**Total: 4 registros**

### 5. Type Payroll Adjust Notes (`type_payroll_adjust_notes`) - Tipos de Nota de Ajuste Nómina
Tipos de nota de ajuste para nómina electrónica.

| Código | Nombre |
|--------|--------|
| 1 | Reemplazar |
| 2 | Eliminar |

**Total: 2 registros**

### 6. Worker Subtype Rules (`worker_subtype_rules`) - Reglas de Aportes por Subtipo
Configuración de tasas y aplicabilidad de aportes según subtipo de trabajador.

Campos principales:
- `sub_type_worker_id`: Subtipo de trabajador relacionado
- `health_employee_rate` / `health_employer_rate`: Tasas de salud
- `pension_employee_rate` / `pension_employer_rate`: Tasas de pensión
- `ccf_applies`, `icbf_applies`, `sena_applies`, `arl_applies`: Aplicabilidad parafiscales
- `fsp_applies`, `fsp_special_rate`: Fondo de Solidaridad Pensional
- `ibc_min_smmlv_percentage`: Porcentaje mínimo IBC
- `legal_notes`: Notas legales de referencia

**Total: 10 registros**

### 7. Tax Obligation Types (`tax_obligation_types`) - Tipos de Obligaciones Tributarias
Catálogo de obligaciones fiscales con periodicidad y aplicabilidad.

| Código | Nombre | Periodicidad |
|--------|--------|--------------|
| RENTA_GC | Renta Grandes Contribuyentes | Anual |
| RENTA_PJ | Renta Personas Jurídicas | Anual |
| RENTA_PN | Renta Personas Naturales | Anual |
| IVA_BIMESTRAL | IVA Bimestral | Bimestral |
| IVA_CUATRIMESTRAL | IVA Cuatrimestral | Cuatrimestral |
| RETEFUENTE | Retención en la Fuente | Mensual |
| RST_ANUAL | RST Declaración Anual | Anual |
| RST_BIMESTRAL | RST Anticipo Bimestral | Bimestral |
| CONSUMO | Impuesto al Consumo | Bimestral |
| PATRIMONIO | Impuesto al Patrimonio | Anual |
| ... | (23 tipos en total) | ... |

Campos adicionales:
- `nit_digit_type`: Tipo de dígito NIT (last_1, last_2, independent)
- `applies_to_gran_contribuyente`, `applies_to_persona_juridica`, `applies_to_persona_natural`, `applies_to_rst`
- `has_multiple_installments`, `installment_count`
- `display_order`

**Total: 23 registros**

## Archivos Creados/Modificados

### Schemas
- `prisma/schema-master.prisma` - Modelos: `Event`, `TypeDocument`, `TypeWorker`, `TypeRejection`, `TypePayrollAdjustNote`, `WorkerSubtypeRule`, `TaxObligationType`
- `prisma/schema-tenant.prisma` - Mismos modelos replicados

### Migraciones
- `20260130142515_add_events/`
- `20260130143824_add_type_documents/`
- `20260130145611_add_type_workers/`
- `20260130151519_add_type_rejections/`
- `20260130152142_add_type_payroll_adjust_notes/`
- `20260130153602_add_worker_subtype_rules/`
- `20260130160030_add_tax_obligation_types/`

### Seeds
- `prisma/seeds/events.ts`
- `prisma/seeds/typeDocuments.ts`
- `prisma/seeds/typeWorkers.ts`
- `prisma/seeds/typeRejections.ts`
- `prisma/seeds/typePayrollAdjustNotes.ts`
- `prisma/seeds/workerSubtypeRules.ts`
- `prisma/seeds/taxObligationTypes.ts`
- `prisma/seeds/seed-catalogs.ts` - Modificado para incluir todos los seeders

### Scripts
- `prisma/scripts/seed-all-tenants.ts` - Modificado para replicar todas las tablas a tenants existentes

## Comandos

### Ejecutar migraciones y seed en Master
```bash
cd contagracia-shared-modules
npx prisma migrate dev --schema=prisma/schema-master.prisma
npx prisma db seed
```

### Aplicar cambios a Tenants existentes
```bash
cd contagracia-shared-modules
npx ts-node prisma/scripts/migrate-all-tenants.ts --force
npx ts-node prisma/scripts/seed-all-tenants.ts --force
```

## Servicios Relacionados

### company-service
- `src/modules/tenant/tenant.service.ts` - Método `replicateParametrics()` actualizado para replicar las 7 nuevas tablas cuando se crea un nuevo Tenant.
