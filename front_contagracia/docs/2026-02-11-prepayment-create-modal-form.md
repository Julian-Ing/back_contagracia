# Modal de creación de anticipos: selector de tercero y tipo

**Fecha:** 2026-02-11

## Cambios

### CreatePrepaymentModal
`src/app/dashboard/prepayments/CreatePrepaymentModal.tsx`

- Reemplazó placeholder por formulario funcional
- **ThirdPartySelect** con `excludeRoles={['CONTACT']}` — los contactos no aplican para anticipos
- **Selección de tipo** con botones según roles del tercero seleccionado:
  - Solo EMPLOYEE → botón "Empleado"
  - Sin EMPLOYEE (tiene CLIENT, SUPPLIER u otros) → botones "Cliente" y "Proveedor"
  - EMPLOYEE + cualquier otro rol → los 3 botones
- Reset de estado al cerrar modal o cambiar tercero

### ThirdPartySelect
`src/shared/components/ui/third-party-select.tsx`

- `ThirdPartyOption` ahora incluye `roles: string[]`
- El mapping de datos del backend agrega `roles: tp.roles || []`

## Lógica de tipos disponibles

```typescript
function getAvailableTypes(roles: string[]): PrepaymentType[] {
  const hasEmployee = roles.includes('EMPLOYEE');
  const hasOther = roles.some((r) => r !== 'EMPLOYEE' && r !== 'CONTACT');

  if (hasEmployee && hasOther) return ['CLIENT', 'SUPPLIER', 'EMPLOYEE'];
  if (hasEmployee) return ['EMPLOYEE'];
  return ['CLIENT', 'SUPPLIER'];
}
```
