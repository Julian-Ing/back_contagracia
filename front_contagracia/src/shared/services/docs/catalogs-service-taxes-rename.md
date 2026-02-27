# Renombre tax_rates a taxes en catalogs.service.ts

## Descripcion
Se renombro `tax_rates` a `taxes` para mantener consistencia con el backend.

## Cambios

### Interface
```typescript
// Antes
export interface TaxRate extends CatalogItem {
  percentage: number;
  tax_type_id: number;
}

// Despues
export interface Tax extends CatalogItem {
  percentage: number;
  tax_type_id: number;
}
```

### CatalogName Type
```typescript
// Antes
export type CatalogName = ... | 'tax_rates' | ...

// Despues
export type CatalogName = ... | 'taxes' | ...
```

### Metodo del Servicio
```typescript
// Antes
getTaxRates: async (): Promise<TaxRate[]> => {
  return catalogsService.getAll<TaxRate>('tax_rates');
}

// Despues
getTaxes: async (): Promise<Tax[]> => {
  return catalogsService.getAll<Tax>('taxes');
}
```

## Uso
```typescript
import { catalogsService, Tax } from '@/shared/services/catalogs.service';

const taxes: Tax[] = await catalogsService.getTaxes();
```

## Archivo Modificado
- `src/shared/services/catalogs.service.ts`
