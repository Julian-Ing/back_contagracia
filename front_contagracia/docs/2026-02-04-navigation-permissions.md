# Permisos de Navegación del Sidebar

## Fecha: 2026-02-04

## Descripción

Se actualizó la configuración de navegación (`src/config/navigation.ts`) para incluir verificación de permisos específicos en cada item del sidebar, además de la verificación de módulos existente.

## Cambios Realizados

### 1. Nuevas Páginas Creadas

- **Bancos y Cuentas**: `/dashboard/banking/page.tsx`
  - Permiso requerido: `bank_accounts.view`
  - Módulo: `banking`

- **Terceros y Anticipos**: `/dashboard/third-parties/page.tsx`
  - Permiso requerido: `third_parties.view`
  - Módulo: `third_parties`

### 2. Permisos Agregados al Sidebar

Cada item del sidebar ahora verifica tanto el módulo como el permiso específico:

| Item | Ruta | Módulo | Permiso |
|------|------|--------|---------|
| Dashboard | `/dashboard` | dashboard | `dashboard.view` |
| Facturas | `/dashboard/invoices` | sales | `sales.invoices.view` |
| Bancos y Cuentas | `/dashboard/banking` | banking | `bank_accounts.view` |
| Cotizaciones | `/dashboard/quotes` | sales, crm | `quotes.view` |
| Terceros y Anticipos | `/dashboard/third-parties` | third_parties | `third_parties.view` |
| Almacenes | `/dashboard/warehouses` | inventory | `inventory.stock.view` |
| Bodegas | `/dashboard/storages` | inventory | `inventory.stock.view` |
| Transferencias | `/dashboard/storage-transfers` | inventory | `inventory.adjustments.view` |
| Productos | `/dashboard/inventory` | inventory | `inventory.items.view` |
| Atributos y Términos | `/dashboard/attributes-and-terms` | inventory | `inventory.attributes.view` |
| Órdenes de Compra | `/dashboard/purchase-orders` | purchases | `purchases.view` |
| Compras | `/dashboard/purchase-history` | purchases | `purchases.view` |
| Gastos | `/dashboard/expenses` | expenses | `expenses.view` |
| Categorías de Gasto | `/dashboard/expense-categories` | expenses | `expense_categories.view` |
| Cuentas por Cobrar | `/dashboard/accounts-receivable` | ar_ap | `ar.view` |
| Cuentas por Pagar | `/dashboard/accounts-payable` | ar_ap | `ap.view` |
| Reportes Cartera | `/dashboard/cartera-reports` | ar_ap | `cartera.reports.view` |
| Config Cartera | `/dashboard/cartera-settings` | ar_ap | `config.view` |
| Causación | `/dashboard/causacion-semiautomatica` | expenses, purchases | `expenses.view` |
| Activos Fijos | `/dashboard/fixed-assets` | fixed_assets | `fixed_assets.view` |
| Contabilidad | `/dashboard/accounting` | accounting | `accounting.view` |
| Punto de Venta | `/dashboard/point-of-sale` | point_of_sale | `pos.access` |
| Cajas Registradoras | `/dashboard/cash-registers` | cash_registers | `cash_registers.view` |
| Sesiones de Caja | `/dashboard/cash-register-sessions` | cash_registers | `cash_sessions.view` |
| Centro de Costos | `/dashboard/cost-centers` | cost_centers | `cost_centers.view` |
| Empleados | `/dashboard/employees` | core_hr | `employees.view` |
| Asistencia | `/dashboard/attendance` | time_attendance | `attendance.view` |
| Permisos | `/dashboard/leaves` | leaves_vacations | `leaves.view` |
| Nómina | `/dashboard/payroll` | hr_payroll | `payroll.view` |
| Gastos Viáticos | `/dashboard/hr-expenses` | hr_expenses | `hr_expenses.view` |
| Solicitudes de Pago | `/dashboard/service-billing` | core_hr | `employees.view` |
| Evaluaciones | `/dashboard/performance-evaluations` | hr_performance | `performance.view` |
| Observaciones | `/dashboard/employee-observations` | hr_performance | `observations.view` |
| Evento Radian | `/dashboard/received-invoices` | radian | `radian.view` |
| CRM Dashboard | `/dashboard/crm` | crm | `crm.dashboard.view` |
| Formularios Web | `/dashboard/crm/forms` | crm | `crm.forms.view` |
| Campañas | `/dashboard/crm/campaigns` | crm | `crm.campaigns.view` |
| Leads | `/dashboard/crm/leads` | crm | `crm.leads.view` |
| Oportunidades | `/dashboard/crm/opportunities` | crm | `crm.opportunities.view` |
| Contactos | `/dashboard/crm/contacts` | crm | `crm.contacts.view` |
| Clientes | `/dashboard/crm/clients` | crm | `crm.contacts.view` |
| Calendario | `/dashboard/crm/activities` | crm | `crm.activities.view` |
| WhatsApp | `/dashboard/crm/whatsapp` | crm | `crm.whatsapp.view` |
| Automatizaciones | `/dashboard/crm/automations` | crm | `crm.automations.view` |
| Desempeño | `/dashboard/crm/employee-performance-v2` | crm | `crm.reports.view` |
| Equipos | `/dashboard/crm/team-management` | crm | `crm.team.view` |
| Calendario Tributario | `/dashboard/tax-calendar` | tax | `tax_calendar.view` |
| Reportes | `/dashboard/reports` | reports | `reports.view` |
| Perfil Empresa | `/dashboard/company-profile` | company_profile | `company.profile.view` |
| Usuarios | `/dashboard/company-users` | user_management | `users.view` |
| Configuraciones | `/dashboard/configurations` | configurations | `config.view` |
| Plantillas Email | `/dashboard/email-templates` | crm, ar_ap | `templates.email.view` |
| Plantillas WhatsApp | `/dashboard/whatsapp-templates` | crm, ar_ap | `templates.whatsapp.view` |

## Lógica de Verificación

La función `shouldShowNavItem` en `navigation.ts` verifica:

1. **Módulos**: El usuario debe tener habilitado al menos uno de los módulos listados (OR)
2. **Permisos**: Si el item tiene un `permission`, el usuario debe tener ese permiso específico

```typescript
export function shouldShowNavItem(
  item: NavItemConfig,
  enabledModules: string[],
  userActions: string[]
): boolean {
  // Verificar módulos (OR - cualquiera de ellos)
  if (item.modules && item.modules.length > 0) {
    const hasModule = item.modules.some((module) => enabledModules.includes(module));
    if (!hasModule) return false;
  }

  // Verificar permiso específico
  if (item.permission) {
    if (!userActions.includes(item.permission)) return false;
  }

  return true;
}
```

## Archivos Modificados

- `src/config/navigation.ts` - Agregados permisos a todos los items
- `src/app/dashboard/banking/page.tsx` - Nueva página (placeholder)
- `src/app/dashboard/third-parties/page.tsx` - Nueva página (placeholder)

## Notas

- Los permisos se obtienen del backend en `contagracia-shared-modules/prisma/seeds/modules/actions/`
- El sidebar ahora oculta items para los que el usuario no tiene permiso
- Las páginas usan `ProtectedRoute` para verificar permisos en caso de acceso directo por URL
