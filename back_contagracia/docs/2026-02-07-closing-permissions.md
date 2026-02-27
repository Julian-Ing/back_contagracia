# Permisos de Cierre Contable Actualizados

## Descripción
Se actualizaron los permisos del módulo de Cierre Contable para separar acciones de períodos mensuales y anuales.

## Permisos Anteriores (7)
| Key | Nombre |
|-----|--------|
| closing.view | Ver Cierres |
| closing.periods.view | Ver Períodos |
| closing.periods.close | Cerrar Período |
| closing.periods.reopen | Reabrir Período |
| closing.year.close | Cierre Anual |
| closing.entries.generate | Generar Asientos Cierre |
| closing.entries.view | Ver Asientos de Cierre |

## Permisos Nuevos (11)

### Generales
| Key | Nombre | Descripción |
|-----|--------|-------------|
| closing.view | Ver Cierres | Ver módulo de cierres |
| closing.periods.view | Ver Períodos | Ver períodos contables |
| closing.entries.view | Ver Asientos de Cierre | Ver asientos de cierre |

### Períodos Mensuales
| Key | Nombre | Descripción |
|-----|--------|-------------|
| closing.monthly.create | Crear Período Mensual | Crear período mensual |
| closing.monthly.edit | Editar Período Mensual | Editar período mensual |
| closing.monthly.close | Cerrar Período Mensual | Cerrar período mensual |
| closing.monthly.reopen | Reabrir Período Mensual | Reabrir período mensual |

### Períodos Anuales
| Key | Nombre | Descripción |
|-----|--------|-------------|
| closing.annual.create | Crear Período Anual | Crear período anual |
| closing.annual.edit | Editar Período Anual | Editar período anual |
| closing.annual.close | Cerrar Período Anual | Cierre anual (mueve cuentas 4/5/6) |
| closing.annual.reopen | Reabrir Período Anual | Reabrir período anual |

## Cambios en Schema

### AccountingPeriod
Se agregó soporte para relación padre-hijo entre períodos:

```prisma
model AccountingPeriod {
  // ... campos existentes ...

  parent_period_id String? // Período anual padre (para mensuales)

  // Relations
  parent_period    AccountingPeriod?  @relation("PeriodParent", fields: [parent_period_id], references: [id])
  child_periods    AccountingPeriod[] @relation("PeriodParent")

  @@index([parent_period_id])
}
```

## Uso en Frontend
```typescript
const { can } = usePermissions();

// Verificar permisos específicos
const canCreateMonthly = can('closing.monthly.create');
const canCreateAnnual = can('closing.annual.create');
const canCloseMonthly = can('closing.monthly.close');
const canCloseAnnual = can('closing.annual.close');
```

## Migración de Roles Existentes
Los roles que tenían `closing.periods.close` o `closing.periods.reopen` deben actualizarse para incluir los nuevos permisos granulares según corresponda.
