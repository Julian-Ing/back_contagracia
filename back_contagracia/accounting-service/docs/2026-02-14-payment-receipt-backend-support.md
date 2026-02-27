# Soporte backend para formulario de recibos de caja / comprobantes de egreso

## Cambios

### 1. `ar-ap.service.ts` — `account_code` en detalle de tercero

Se agrega `account_code` al response de `getThirdPartyDetail()` para que el frontend pueda usarlo en la cadena de resolucion de cuentas contables al seleccionar un documento CxC/CxP.

**Response transaction actualizado:**
```ts
{
  // ... campos existentes ...
  account_code: string | null;  // NUEVO
}
```

### 2. `prepayments.controller.ts` + `prepayments.service.ts` — Filtro por tercero

Se agrega el query param `third_party_id` al endpoint `GET /prepayments` para que el modal de seleccion de anticipos pueda filtrar por el tercero seleccionado en el formulario de recibo.

**Endpoint:**
```
GET /prepayments?third_party_id=uuid&status=ACTIVE&search=...&page=1&limit=10
```

**Filtro SQL agregado:**
```sql
WHERE ... AND p."third_party_id" = $N
```

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `ar-ap/ar-ap.service.ts` | Agregar `account_code` a response de `getThirdPartyDetail` |
| `prepayments/prepayments.controller.ts` | Nuevo `@Query('third_party_id')` |
| `prepayments/prepayments.service.ts` | Nuevo filtro `third_party_id` en interface y query SQL |
