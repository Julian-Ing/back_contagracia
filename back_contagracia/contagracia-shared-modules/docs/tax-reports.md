# Tax Reports - Reportes de Impuestos

## Descripcion

Modulo para generar reportes de impuestos (IVA, INC, Retefuente, ReteICA, ReteIVA) con integracion a ArAp para crear CxP automaticamente al causar.

## Tablas

### tax_reports

Tabla principal de reportes de impuestos.

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | uuid PK | |
| consecutive | varchar | IM-0001 |
| tax_type | enum | IVA, INC, RETEFUENTE, RETEICA, RETEIVA |
| period_type | enum | MONTHLY, BIMONTHLY, QUARTERLY, ANNUAL |
| period_start | date | Inicio del periodo |
| period_end | date | Fin del periodo |
| year | int | Ano gravable |
| iva_generated | decimal(19,4) | IVA generado |
| iva_descontable | decimal(19,4) | IVA descontable |
| iva_favor | decimal(19,4) | IVA a favor |
| iva_reteiva_favor | decimal(19,4) | ReteIVA a favor |
| inc_generated | decimal(19,4) | INC generado |
| reteiva_payable | decimal(19,4) | ReteIVA por pagar |
| retefuente_payable | decimal(19,4) | Retefuente por pagar |
| reteica_payable | decimal(19,4) | ReteICA por pagar |
| net_amount | decimal(19,4) | Saldo neto |
| status | enum | DRAFT, CAUSED, PAID |
| emission_date | date | Fecha de emision |
| due_date | date | Fecha limite pago DIAN |
| ar_ap_id | uuid FK? | -> ar_ap.id (CxP creada al causar) |
| journal_entry_id | uuid FK? | -> journal_entries.id |
| created_by | uuid FK | -> tenant_users.id |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Constraints:**
- UNIQUE(tax_type, period_start, period_end)

### tax_report_items

Lineas que conforman cada reporte, referenciando los journal_entry_items.

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | uuid PK | |
| tax_report_id | uuid FK | -> tax_reports.id |
| journal_entry_item_id | uuid FK | -> journal_entry_items.id |
| type | enum | Tipo de item (ver abajo) |
| base_amount | decimal(19,4) | Base gravable |
| tax_amount | decimal(19,4) | Monto del impuesto |
| created_at | timestamptz | |

## Enums

### TaxReportTaxType
- IVA
- INC
- RETEFUENTE
- RETEICA
- RETEIVA

### TaxReportStatus
- DRAFT - Borrador, calculando
- CAUSED - Causado, crea CxP en ArAp
- PAID - Pagado (CxP saldada)

### TaxPeriodType
- MONTHLY - Mensual (grandes contribuyentes)
- BIMONTHLY - Bimestral (IVA regimen comun)
- QUARTERLY - Cuatrimestral (IVA pequenos)
- ANNUAL - Anual

### TaxReportItemType
- IVA_GENERATED - IVA generado
- IVA_DESCONTABLE - IVA descontable
- IVA_FAVOR - IVA a favor
- RETEIVA_FAVOR - ReteIVA a favor
- RETEIVA_PAYABLE - ReteIVA por pagar
- RETEFUENTE_PAYABLE - Retefuente por pagar
- RETEICA_PAYABLE - ReteICA por pagar
- INC_GENERATED - INC generado

## Flujo de Uso

1. Usuario crea tax_report (status=DRAFT)
2. Sistema calcula montos desde journal_entry_items
3. Usuario "Causa" -> status=CAUSED, crea CxP en ar_ap con due_date de DIAN
4. Usuario paga CxP desde ArAp -> status=PAID automatico

## Relaciones

```
tax_reports.ar_ap_id -> ar_ap.id
tax_reports.journal_entry_id -> journal_entries.id
tax_reports.created_by -> tenant_users.id
tax_report_items.tax_report_id -> tax_reports.id
tax_report_items.journal_entry_item_id -> journal_entry_items.id
```

## Notas

- ICA y IMPUESTO_RENTA no estan incluidos (los agregaran companeros)
- tax_calendar_dates lo agregaran companeros (calendario tributario DIAN)
