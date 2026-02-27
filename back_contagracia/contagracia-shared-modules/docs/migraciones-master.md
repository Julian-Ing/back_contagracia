# Migraciones Master Database

## Migraciones aplicadas (2026-01-28)

| Migración | Descripción |
|---|---|
| `20260128135647_init_master` | Esquema inicial master |
| `20260128213933_remove_economic_activities` | Eliminación de actividades económicas |
| `20260128215622_add_tax_types` | Modelo TaxType agregado |
| `20260128215909_tax_type_int_id` | Cambio de TaxType.id a Int |
| `20260128225539_remove_country_code_unique` | Quitar @unique de Country.code (duplicado 'SI' en datos DIAN: Eslovenia y Suecia) |
| `20260128234518_remove_code_symbol_from_product_units` | Quitar campos code y symbol de ProductUnit (code del viejo sistema era el id real) |
| `20260128234839_add_tax_type_relation_to_tax_rate` | Relación TaxRate → TaxType (default IVA id=1) |
| `20260129021521_add_integrations_tables` | Tablas Integration e IntegrationKey para configuración de integraciones (email, etc.) |

## Cambios en el Schema (`schema-master.prisma`)

- **Country**: Se quitó `@unique` de `code` porque datos DIAN tienen código duplicado 'SI' (Eslovenia y Suecia).
- **ProductUnit**: Se eliminaron campos `code` (requerido) y `symbol` se hizo opcional. El `code` del sistema anterior se usa como `id`.
- **TaxRate**: Se agregó campo `tax_type_id Int @default(1)` con relación a `TaxType`.
- **TaxType**: Se agregó relación inversa `tax_rates TaxRate[]`.
- **Integration**: Nuevo modelo para integraciones del sistema (email, pagos, storage, etc.). Campos: `id`, `code` (unique), `name`, `type`, `description`, `is_active`.
- **IntegrationKey**: Llaves de configuración por integración. Campos: `id`, `integration_id`, `key_name`, `key_value`, `is_secret`. Unique constraint en `[integration_id, key_name]`.
- **EmailVerification**: Se agregaron campos `email` (para verificación pre-registro) y `code` (código de 6 dígitos para OTP).
