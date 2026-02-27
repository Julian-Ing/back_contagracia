# Payment Methods: Permisos y Seeder - 2026-02-11

## Archivos modificados

- `contagracia-shared-modules/prisma/seeds/modules/actions/ar_ap.ts`

---

## 1. Permisos agregados al módulo AR_AP

Se agregaron 4 nuevas acciones al seeder del módulo `ar_ap` para el CRUD de métodos de pago de empresa:

| action_key | action_name | Descripción |
|------------|-------------|-------------|
| `payment_methods.view` | Ver Métodos de Pago | Ver métodos de pago de la empresa |
| `payment_methods.create` | Crear Método de Pago | Crear método de pago personalizado |
| `payment_methods.edit` | Editar Método de Pago | Editar método de pago personalizado |
| `payment_methods.delete` | Eliminar Método de Pago | Eliminar método de pago personalizado |

### Total de acciones del módulo AR_AP

Pasó de 22 a 26 permisos.

---

## 2. Seeder ejecutado

1. **Master seed** (`npx ts-node prisma/seeds/seed.ts`): Registró 568 acciones totales en master (incluyendo las 4 nuevas).
2. **Seed all tenants** (`npx ts-node prisma/scripts/seed-all-tenants.ts --force`): Propagó los 32 módulos, 568 acciones y 1136 permisos de rol a todos los tenants activos.

---

## Nota

Los métodos de pago (`CompanyPaymentMethod`) no requieren tabla de movimientos aparte, ya que la tabla `payments` tiene FK `company_payment_method_id` que permite rastrear todos los pagos por método.
