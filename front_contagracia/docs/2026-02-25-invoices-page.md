# Página de Facturas de Venta (placeholder)

**Fecha:** 2026-02-25

## Cambios

### Nueva página `/dashboard/invoices`
- **Archivo:** `src/app/dashboard/invoices/page.tsx`
- Página placeholder con diseño consistente (mismo patrón que Bancos y Cuentas)
- Icono `FileText` con fondo `bg-indigo-500`
- Protegida con `ProtectedRoute` (permiso `sales.invoices.view`, módulo `sales`)
- El sidebar ya tenía la entrada configurada en `navigation.ts`
- El permiso `sales.invoices.view` y módulo `sales` ya estaban en los seeders
