# Métodos de Pago: Entrada en sidebar - 2026-02-11

## Archivos modificados

- `src/config/navigation.ts`

---

## 1. Nueva entrada en sidebar

Se agregó "Métodos de Pago" como subitem de la sección **Cartera** en la navegación lateral.

### Configuración

```typescript
{
  id: 'metodos-pago',
  label: 'Métodos de Pago',
  href: '/dashboard/payment-methods',
  icon: CreditCard,
  modules: ['ar_ap'],
  permission: 'payment_methods.view',
}
```

### Ubicación en sidebar

Cartera:
- CxC (Cuentas por Cobrar)
- CxP (Cuentas por Pagar)
- **Métodos de Pago** ← nuevo

---

## 2. Permiso requerido

La entrada solo es visible para usuarios con el permiso `payment_methods.view` del módulo `ar_ap`.

---

## Nota

La página `/dashboard/payment-methods` aún no existe. Será implementada como CRUD de `CompanyPaymentMethod`.
