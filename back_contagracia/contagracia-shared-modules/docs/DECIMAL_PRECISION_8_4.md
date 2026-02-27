# Precisión Decimal: 8,4

## Cambio
Campos de porcentaje cambiados de `Decimal(5,2)` a `Decimal(8,4)` para soportar valores como 19.00% (IVA).

## Tablas afectadas

### Master y Tenant
- `tax_rates.rate`
- `arl_risks.rate`
- `worker_subtype_rules.health_employee_rate`
- `worker_subtype_rules.health_employer_rate`
- `worker_subtype_rules.pension_employee_rate`
- `worker_subtype_rules.pension_employer_rate`
- `worker_subtype_rules.fsp_special_rate`
- `worker_subtype_rules.ibc_min_smmlv_percentage`

### Solo Master
- `plans.price`

### Solo Tenant
- `third_parties.commission_rate`
- `invoice_items.tax_rate`
- `payroll_config.exoneration_threshold_smmlv`
- `payroll_config.fsp_threshold_smmlv`
- `payroll_config.icbf_sena_exoneration_threshold`
- `payroll_config.vacation_days_per_year`
- `integrations_config.default_commission_rate`

## Migración
- `20260131155849_decimal_precision_8_4`
