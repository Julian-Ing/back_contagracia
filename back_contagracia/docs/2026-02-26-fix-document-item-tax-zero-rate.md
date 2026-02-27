# Fix: DocumentItemTax no se creaba para IVA 0% (AIU)

**Fecha:** 2026-02-26

## Problema

En el flujo de facturacion AIU (Administracion, Imprevistos, Utilidad), los items pueden tener impuesto IVA con tarifa del 0%. Sin embargo, al crear o actualizar un documento, el servicio no generaba el registro `DocumentItemTax` para estos items.

### Causa raiz

La condicion para crear `DocumentItemTax` exigia que la tarifa fuera mayor a 0:

```typescript
// ANTES — documents.service.ts (create y update)
if (item.tax_id && rate.gt(0)) {
  // crear DocumentItemTax...
}
```

Esto excluia IVA 0% (donde `rate` es `0`), que es un impuesto valido en AIU. El item tenia `tax_id` asignado, pero no se persistia la relacion en `DocumentItemTax`.

## Solucion

Eliminar la condicion `rate.gt(0)`, dejando solo la verificacion de que el item tenga un impuesto asignado:

```typescript
// DESPUES
if (item.tax_id) {
  // crear DocumentItemTax — incluyendo IVA 0%
}
```

El cambio se aplico en ambos metodos: `create` y `update` del servicio de documentos.

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `invoicing-service/src/modules/documents/documents.service.ts` | Removida condicion `rate.gt(0)` en create y update — ahora IVA 0% genera DocumentItemTax |

## Impacto

- Documentos AIU existentes creados antes del fix NO tienen sus registros `DocumentItemTax` para IVA 0%. Si se editan y guardan, el registro se creara correctamente.
- Documentos nuevos con IVA 0% generaran `DocumentItemTax` con `tax_amount = 0` correctamente.
