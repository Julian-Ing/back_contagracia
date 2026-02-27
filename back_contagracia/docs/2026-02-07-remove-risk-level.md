# Eliminación de RiskLevel del Sistema

## Descripción
Se elimina el campo `risk_level` del sistema de acciones/permisos ya que no se estaba utilizando y agregaba complejidad innecesaria.

## Cambios Realizados

### Schema Master (`schema-master.prisma`)
- Eliminado enum `RiskLevel` (LOW, MEDIUM, HIGH, CRITICAL)
- Eliminado campo `risk_level` de `SystemAction`

### Schema Tenant (`schema-tenant.prisma`)
- Eliminado enum `RiskLevel`
- Eliminado campo `risk_level` de `SystemAction`

### Migración
- `20260207155125_remove_risk_level/` - Migración que elimina la columna

### Seeds de Acciones
Todos los archivos de seeds fueron actualizados para remover `risk_level`:
- `accounting.ts`
- `ar_ap.ts`
- `banking.ts`
- `cash_registers.ts`
- `closing.ts`
- `communication_templates.ts`
- `company_profile.ts`
- `configurations.ts`
- `core_hr.ts`
- `cost_centers.ts`
- `crm.ts`
- `dashboard.ts`
- `exogenous.ts`
- `expenses.ts`
- `fixed_assets.ts`
- `hr_expenses.ts`
- `hr_payroll.ts`
- `hr_performance.ts`
- `inventory.ts`
- `inventory_management.ts`
- `leaves_vacations.ts`
- `point_of_sale.ts`
- `purchase_orders.ts`
- `purchases.ts`
- `quotes.ts`
- `radian.ts`
- `reports.ts`
- `sales.ts`
- `tax.ts`
- `third_parties.ts`
- `time_attendance.ts`
- `user_management.ts`

### Types (`types.ts`)
```typescript
// Antes
export interface ActionDef {
  action_key: string;
  action_name: string;
  description: string;
  risk_level: RiskLevel;
}

// Después
export interface ActionDef {
  action_key: string;
  action_name: string;
  description: string;
}
```

### DTOs (`create-system-action.dto.ts`)
- Eliminado campo `risk_level` del DTO de creación

### Services
- `companies.service.ts` - Ajustes menores
- `plans.service.ts` - Ajustes menores
- `tenant.service.ts` - Ajustes menores

## Razón del Cambio
El campo `risk_level` fue diseñado originalmente para clasificar acciones por nivel de riesgo, pero nunca se implementó la lógica que lo utilizaría (como alertas, auditoría especial, o restricciones). Mantenerlo agregaba complejidad sin beneficio.

## Impacto
- No hay impacto en funcionalidad existente
- Se requiere ejecutar migración en bases de datos existentes
- Se requiere re-ejecutar seeds para actualizar acciones
