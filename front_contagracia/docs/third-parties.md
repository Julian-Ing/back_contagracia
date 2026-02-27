# Módulo de Terceros (Frontend)

## Estructura
```
src/modules/third-parties/
├── components/
│   ├── ThirdPartyForm.tsx
│   └── ThirdPartiesList.tsx
├── hooks/
│   └── useThirdParties.ts
├── services/
│   └── thirdParties.service.ts
├── types/
│   └── index.ts
└── index.ts
```

## Componentes

### ThirdPartiesList
```tsx
<ThirdPartiesList canEdit={true} onEdit={(tp) => {}} />
```

### ThirdPartyForm
```tsx
<ThirdPartyForm mode="create" onSuccess={() => {}} onCancel={() => {}} />
<ThirdPartyForm mode="edit" initialData={tp} onSuccess={() => {}} onCancel={() => {}} />
```

## Hook
```tsx
const { thirdParties, total, page, totalPages, loading, error, search, setPage, refetch } = useThirdParties({ limit: 20 });
```

## Servicio
- `getAll(filters)` - Listar
- `getOne(id)` - Obtener
- `create(data)` - Crear
- `update(id, data)` - Actualizar
- `delete(id)` - Eliminar
- `exists(nit)` - Verificar
- `queryRut(nit)` - Consultar DIAN
- `loadCxcAccounts(search, page)` - Cuentas 13*
- `loadCxpAccounts(search, page)` - Cuentas 2*

## Tipos
```typescript
type ThirdPartyRole = 'CLIENT' | 'SUPPLIER' | 'EMPLOYEE' | 'CONTACT' | 'EPS' | 'PENSION_FUND' | 'ARL' | 'COMPENSATION_FUND' | 'SEVERANCE_FUND' | 'SENA' | 'ICBF' | 'OTHER';

const SELECTABLE_ROLES; // Excluye EMPLOYEE y CONTACT
const ROLE_LABELS;      // Labels español
const ROLE_COLORS;      // Tailwind classes
```

## Permisos
- `third_parties.view`
- `third_parties.create`
- `third_parties.edit`
