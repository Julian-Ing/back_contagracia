# Estructura de Seeders de Módulos y Permisos

## Descripción

Los seeders de módulos y permisos han sido reorganizados en una estructura modular para facilitar el mantenimiento y ajustes futuros.

## Ubicación

```
prisma/seeds/modules/
├── types.ts              # Tipos compartidos (ModuleDef, ActionDef, RiskLevel)
├── definitions.ts        # Definiciones de los 32 módulos del sistema
├── dependencies.ts       # Dependencias entre módulos
├── index.ts              # Función seedModules() y exports principales
└── actions/
    ├── index.ts          # Exporta actionsByModule y ALL_MODULE_KEYS
    ├── dashboard.ts      # Permisos del módulo Dashboard
    ├── sales.ts          # Permisos del módulo Ventas
    ├── quotes.ts         # Permisos del módulo Cotizaciones
    ├── point_of_sale.ts  # Permisos del módulo POS
    ├── cash_registers.ts # Permisos del módulo Cajas
    ├── inventory.ts      # Permisos del módulo Inventario
    ├── inventory_management.ts
    ├── purchase_orders.ts
    ├── purchases.ts
    ├── expenses.ts
    ├── third_parties.ts
    ├── ar_ap.ts
    ├── accounting.ts
    ├── banking.ts
    ├── fixed_assets.ts
    ├── cost_centers.ts
    ├── tax.ts
    ├── closing.ts
    ├── exogenous.ts
    ├── radian.ts
    ├── core_hr.ts
    ├── time_attendance.ts
    ├── leaves_vacations.ts
    ├── hr_payroll.ts
    ├── hr_expenses.ts
    ├── hr_performance.ts
    ├── crm.ts
    ├── communication_templates.ts
    ├── reports.ts
    ├── user_management.ts
    ├── company_profile.ts
    └── configurations.ts
```

## Cómo agregar/modificar permisos

### Agregar un nuevo permiso a un módulo existente

1. Abrir el archivo correspondiente en `modules/actions/`, por ejemplo `accounting.ts`
2. Agregar el nuevo permiso al array:

```typescript
{
  action_key: 'accounting.new_action',
  action_name: 'Nueva Acción',
  description: 'Descripción de la acción',
  risk_level: RiskLevel.MEDIUM
},
```

3. Ejecutar el seeder: `pnpm prisma:seed`

### Eliminar un permiso

1. Abrir el archivo correspondiente en `modules/actions/`
2. Eliminar la línea del permiso
3. Ejecutar el seeder

### Agregar un nuevo módulo

1. Agregar la definición en `modules/definitions.ts`
2. Crear el archivo `modules/actions/nuevo_modulo.ts`
3. Importar y exportar en `modules/actions/index.ts`
4. Si tiene dependencias, agregarlas en `modules/dependencies.ts`
5. Ejecutar el seeder

## Tipos disponibles

```typescript
// RiskLevel para clasificar el nivel de riesgo de una acción
enum RiskLevel {
  LOW,      // Acciones de solo lectura
  MEDIUM,   // Acciones de creación/edición básica
  HIGH,     // Acciones que afectan datos importantes
  CRITICAL  // Acciones administrativas sensibles
}

// Estructura de un permiso
interface ActionDef {
  action_key: string;      // Clave única del permiso (ej: 'sales.invoices.create')
  action_name: string;     // Nombre para mostrar
  description: string;     // Descripción del permiso
  risk_level: RiskLevel;   // Nivel de riesgo
}
```

## Ejecutar el seeder

```bash
cd back_contagracia/contagracia-shared-modules
pnpm prisma:seed
```

## Estadísticas actuales

- **32 módulos**
- **549 permisos** distribuidos en los módulos
- **26 dependencias** entre módulos
