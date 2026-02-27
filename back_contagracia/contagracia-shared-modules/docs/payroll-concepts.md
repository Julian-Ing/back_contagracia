# Conceptos de Nomina (Payroll Concepts)

## Descripcion General

El sistema maneja 61 conceptos de nomina predefinidos que se utilizan para calcular y contabilizar la nomina de los empleados. Cada concepto tiene asociadas cuentas contables para el debito operativo, debito administrativo y credito.

## Estructura de Datos

### Modelo PayrollConcept

```prisma
model PayrollConcept {
  key                              String              @id
  name                             String
  debit_account_code               String?
  administrative_debit_account_code String?
  credit_account_code              String?
  default_value                    Decimal?            @db.Decimal(18, 4)
  default_percentage               Decimal?            @db.Decimal(18, 4)
  is_percentage                    Boolean             @default(false)
  is_array                         Boolean             @default(false)
  is_legal                         Boolean             @default(false)
  concept_type                     PayrollConceptType  @default(ACCRUED)
  created_at                       DateTime            @default(now())
  updated_at                       DateTime            @updatedAt
}
```

### Tipos de Concepto (PayrollConceptType)

| Tipo | Descripcion |
|------|-------------|
| `ACCRUED` | Devengados - conceptos que incrementan el salario |
| `DEDUCTION` | Deducciones - conceptos que reducen el salario |
| `PROVISION` | Provisiones - reservas contables |
| `PARAFISCAL` | Parafiscales - aportes del empleador |

## Cuentas Contables

### Estructura de Clases PUC

- **51** - Gastos Administrativos (Operativo)
- **52** - Gastos no Administrativos (Administrativo)
- **53** - Gastos no operacionales (solo financieros)

### Logica de Cuentas

| Tipo Concepto | Debito Operativo | Debito Administrativo | Credito |
|---------------|------------------|----------------------|---------|
| ACCRUED | 51xxxx | 52xxxx | 250505 (Salarios por pagar) |
| DEDUCTION | 250505 | 250505 | 23xxxx (Cuentas por pagar) |
| PROVISION | 519xxx | 529xxx | 27xxxx (Provisiones) |
| PARAFISCAL | 51xxxx | 52xxxx | 237xxx (Aportes por pagar) |

## Lista de Conceptos

### Devengados (ACCRUED)

| Key | Nombre | Debito | Credito |
|-----|--------|--------|---------|
| `salary` | Salario | 510505 | 250505 |
| `worked_days` | Dias Trabajados | 510505 | 250505 |
| `transportation_allowance` | Auxilio de Transporte | 513065 | 250505 |
| `bonuses` | Bonificaciones | 510576 | 250505 |
| `commissions` | Comisiones | 513025 | 250505 |
| `HEDs` | Horas Extras Diurnas | 512590 | 250505 |
| `HENs` | Horas Extras Nocturnas | 513045 | 250505 |
| `HEDDFs` | Horas Extras Diurnas Dom/Fest | 510529 | 250505 |
| `HENDFs` | Horas Extras Nocturnas Dom/Fest | 519900 | 250505 |
| `HRNs` | Recargo Nocturno | 510529 | 250505 |
| `HRDDFs` | Recargo Diurno Dom/Fest | 519900 | 250505 |
| `HRNDFs` | Recargo Nocturno Dom/Fest | 519900 | 250505 |
| `severance` | Cesantias | 510600 | 250505 |
| `service_bonus` | Prima de Servicios | 513060 | 250505 |
| `paid_vacation` | Vacaciones Compensadas | 510587 | 250505 |
| `common_vacation` | Vacaciones Comunes | 519900 | 250505 |

### Deducciones (DEDUCTION)

| Key | Nombre | Debito | Credito |
|-----|--------|--------|---------|
| `eps_deduction` | Deduccion Salud | 250505 | 237035 |
| `pension_deduction` | Deduccion Pension | 250505 | 237040 |
| `fondosp_deduction_SP` | Fondo Solidaridad Pensional | 250505 | 238099 |
| `withholding_at_source` | Retencion en la Fuente | 250505 | 236555 |
| `afc` | AFC | 250505 | 238040 |
| `voluntary_pension` | Pension Voluntaria | 250505 | 238020 |
| `orders` | Libranzas | 250505 | 238050 |
| `cooperative` | Cooperativa | 250505 | 238065 |
| `labor_union` | Sindicatos | 250505 | 238060 |

### Parafiscales (PARAFISCAL)

| Key | Nombre | Debito | Credito | Porcentaje |
|-----|--------|--------|---------|------------|
| `arl` | ARL | 513005 | 237055 | 0.52% |
| `employer_health` | Aporte Salud Empleador | 512560 | 237035 | 8.50% |
| `employer_pension` | Aporte Pension Empleador | 512580 | 237040 | 12.00% |
| `ccf` | Caja Compensacion | 513050 | 237060 | 4.00% |
| `sena` | SENA | 512545 | 237050 | 2.00% |
| `icbf` | ICBF | 143501 | 237045 | 3.00% |

### Provisiones (PROVISION)

| Key | Nombre | Debito | Credito | Porcentaje |
|-----|--------|--------|---------|------------|
| `vacation_provision` | Provision Vacaciones | 519920 | 270515 | 4.17% |
| `severance_provision` | Provision Cesantias | 519930 | 270505 | 8.33% |
| `severance_interest_provision` | Provision Int. Cesantias | 519950 | 279999 | 1.00% |
| `service_bonus_provision` | Provision Prima | 519940 | 279999 | 8.33% |

## Keys con Mayusculas

Algunos conceptos mantienen mayusculas en su key por compatibilidad:

- `HEDDFs` - Horas Extras Diurnas Dominicales/Festivas
- `HEDs` - Horas Extras Diurnas
- `HENDFs` - Horas Extras Nocturnas Dominicales/Festivas
- `HENs` - Horas Extras Nocturnas
- `HRDDFs` - Recargo Diurno Dominical/Festivo
- `HRNDFs` - Recargo Nocturno Dominical/Festivo
- `HRNs` - Recargo Nocturno
- `fondosp_deduction_SP` - Fondo de Solidaridad Pensional

## Archivos Relacionados

- `prisma/seeds/seed-payroll-concepts.ts` - Seeder de conceptos
- `prisma/seeds/seed-puc.ts` - Seeder de cuentas PUC
- `prisma/schema-master.prisma` - Schema master
- `prisma/schema-tenant.prisma` - Schema tenant

## Comandos

```bash
# Ejecutar seeder master
npx ts-node prisma/seeds/seed.ts

# Ejecutar seeder tenants
npx ts-node prisma/scripts/seed-all-tenants.ts
```
