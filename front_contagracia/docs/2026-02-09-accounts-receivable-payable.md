# Cuentas por Cobrar y Cuentas por Pagar - 2026-02-09

## Descripcion

Vistas para el modulo de Cuentas por Cobrar (CxC) y Cuentas por Pagar (CxP) con datos mock.

## Estado Actual

Las paginas muestran datos mock para visualizar la estructura de la interfaz. No hay funcionalidad real implementada aun.

## Rutas

| Ruta | Permiso | Descripcion |
|------|---------|-------------|
| `/dashboard/accounts-receivable` | `ar.view` | Cuentas por Cobrar |
| `/dashboard/accounts-payable` | `ap.view` | Cuentas por Pagar |

## Permisos

### Cuentas por Cobrar (ar.*)

| Permiso | Descripcion |
|---------|-------------|
| `ar.view` | Ver Cuentas x Cobrar |
| `ar.aging.view` | Ver Antiguedad CxC |
| `ar.payments.register` | Registrar Cobro |
| `ar.payments.view` | Ver Pagos Recibidos |
| `ar.export` | Exportar CxC |

### Cuentas por Pagar (ap.*)

| Permiso | Descripcion |
|---------|-------------|
| `ap.view` | Ver Cuentas x Pagar |
| `ap.aging.view` | Ver Antiguedad CxP |
| `ap.payments.register` | Registrar Pago |
| `ap.payments.view` | Ver Pagos Realizados |
| `ap.export` | Exportar CxP |

## Validacion de Permisos

### Sidebar (navegacion)

El sidebar usa `shouldShowNavItem()` para mostrar/ocultar items:

```typescript
// Solo muestra si tiene modulo ar_ap Y permiso especifico
{
  label: 'Cuentas por Cobrar',
  href: '/dashboard/accounts-receivable',
  modules: ['ar_ap'],
  permission: 'ar.view',
}
```

### Pagina (acceso directo)

Cada pagina valida permisos internamente:

```typescript
const { can } = usePermissions();
const canView = can('ar.view');

if (!canView) {
  return <NoPermissionMessage />;
}
```

## Modulo Requerido

Las paginas requieren que la empresa tenga el modulo `ar_ap` habilitado.

## Componentes de la Vista

### Pagina Principal (CxC y CxP)

1. **Header**: Titulo y descripcion
2. **Summary Cards** (4 tarjetas):
   - Clientes/Proveedores con saldo
   - Total facturado/comprado
   - Total recaudado/pagado
   - Saldo pendiente
3. **Filtros**:
   - Tabs: Pendientes / Pagados
   - Busqueda por nombre o identificacion
4. **Tabla**:
   - Nombre del tercero
   - Identificacion
   - Total facturado/comprado
   - Total pagado
   - Saldo pendiente
   - Boton "Ver Detalle"

### Modal de Detalle (BalanceDetailModal)

1. **Summary Cards** (3 tarjetas):
   - Total facturado
   - Total pagado
   - Saldo pendiente
2. **Tabs**:
   - Facturas/Compras: Lista de documentos con numero, fecha, vencimiento, valor, saldo
   - Recibos de Caja / Comprobantes de Egreso: Lista de pagos con numero, fecha, metodo, monto

## Archivos

- `src/app/dashboard/accounts-receivable/page.tsx` - Pagina CxC
- `src/app/dashboard/accounts-payable/page.tsx` - Pagina CxP
- `src/app/dashboard/accounts-receivable/components/BalanceDetailModal.tsx` - Modal compartido

## Proximos Pasos

1. Backend: Crear ArApService con funciones para listar saldos por tercero
2. Backend: Endpoints para listar CxC y CxP con filtros
3. Frontend: Reemplazar datos mock con llamadas a API
4. Frontend: Implementar Recibos de Caja (RC) para cobros
5. Frontend: Implementar Comprobantes de Egreso (CE) para pagos
6. Frontend: Integrar anticipos
