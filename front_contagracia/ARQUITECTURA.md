# Arquitectura Mejorada - Contagracia Frontend

## Estructura de Carpetas Propuesta

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Grupo de rutas de autenticación
│   │   ├── login/
│   │   ├── register/
│   │   └── reset-password/
│   ├── (public)/                 # Rutas públicas
│   │   ├── blog/
│   │   ├── quote/
│   │   └── forms/
│   ├── (dashboard)/              # Rutas protegidas del dashboard
│   │   ├── dashboard/            # Home del dashboard
│   │   ├── inventory/            # Inventario
│   │   ├── purchases/            # Compras
│   │   ├── sales/                # Ventas
│   │   ├── expenses/             # Gastos
│   │   ├── accounting/           # Contabilidad
│   │   ├── banking/              # Bancos
│   │   ├── tax/                  # Impuestos
│   │   ├── hr/                   # Recursos Humanos
│   │   ├── crm/                  # CRM
│   │   ├── reports/              # Reportes
│   │   └── settings/             # Configuraciones
│   ├── api/                      # API Routes de Next.js
│   ├── layout.tsx                # Layout raíz
│   ├── page.tsx                  # Landing page
│   └── globals.css               # Estilos globales
│
├── modules/                      # Módulos de negocio (Feature-based)
│   ├── auth/                     # Autenticación
│   │   ├── components/           # Componentes específicos de auth
│   │   ├── hooks/                # Hooks de auth
│   │   ├── services/             # Servicios de auth
│   │   ├── stores/               # Estado de auth (Zustand)
│   │   ├── types/                # Tipos TypeScript
│   │   └── utils/                # Utilidades de auth
│   │
│   ├── inventory/                # Inventario
│   │   ├── components/
│   │   │   ├── ProductForm/
│   │   │   ├── ProductList/
│   │   │   ├── WarehouseManager/
│   │   │   └── TransferModal/
│   │   ├── hooks/
│   │   │   ├── useProducts.ts
│   │   │   ├── useWarehouses.ts
│   │   │   └── useTransfers.ts
│   │   ├── services/
│   │   │   ├── product.service.ts
│   │   │   └── warehouse.service.ts
│   │   ├── stores/
│   │   │   └── inventoryStore.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── utils/
│   │       └── inventory.utils.ts
│   │
│   ├── sales/                    # Ventas
│   ├── purchases/                # Compras
│   ├── expenses/                 # Gastos
│   ├── accounting/               # Contabilidad
│   ├── banking/                  # Bancos
│   ├── tax/                      # Impuestos
│   ├── hr/                       # RH
│   ├── crm/                      # CRM
│   ├── reports/                  # Reportes
│   └── company/                  # Empresa
│
├── shared/                       # Código compartido entre módulos
│   ├── components/               # Componentes compartidos
│   │   ├── ui/                   # Componentes base (shadcn)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ...
│   │   ├── layout/               # Layouts
│   │   │   ├── DashboardLayout/
│   │   │   ├── Sidebar/
│   │   │   ├── Header/
│   │   │   └── Footer/
│   │   ├── data-display/         # Visualización de datos
│   │   │   ├── DataTable/
│   │   │   ├── Card/
│   │   │   ├── Badge/
│   │   │   └── Pagination/
│   │   ├── forms/                # Componentes de formularios
│   │   │   ├── FormField/
│   │   │   ├── SearchableSelect/
│   │   │   ├── DatePicker/
│   │   │   └── FileUpload/
│   │   └── feedback/             # Feedback al usuario
│   │       ├── Toast/
│   │       ├── Loading/
│   │       ├── EmptyState/
│   │       └── ErrorBoundary/
│   │
│   ├── hooks/                    # Hooks compartidos
│   │   ├── useDebounce.ts
│   │   ├── useLocalStorage.ts
│   │   ├── useMediaQuery.ts
│   │   ├── usePagination.ts
│   │   └── usePermissions.ts
│   │
│   ├── services/                 # Servicios compartidos
│   │   ├── api/
│   │   │   ├── client.ts         # Cliente HTTP (axios/fetch)
│   │   │   └── interceptors.ts
│   │   ├── auth.service.ts
│   │   ├── notification.service.ts
│   │   └── storage.service.ts
│   │
│   ├── stores/                   # Estado global (Zustand)
│   │   ├── authStore.ts
│   │   ├── companyStore.ts
│   │   ├── themeStore.ts
│   │   └── notificationStore.ts
│   │
│   ├── types/                    # Tipos TypeScript globales
│   │   ├── api.types.ts
│   │   ├── company.types.ts
│   │   ├── user.types.ts
│   │   └── index.ts
│   │
│   ├── utils/                    # Utilidades globales
│   │   ├── format.ts             # Formateo de datos
│   │   ├── validation.ts         # Validaciones
│   │   ├── constants.ts          # Constantes
│   │   └── helpers.ts            # Helpers generales
│   │
│   ├── lib/                      # Librerías y configuraciones
│   │   ├── cn.ts                 # Tailwind cn utility
│   │   ├── axios.ts              # Configuración Axios
│   │   └── dayjs.ts              # Configuración Day.js
│   │
│   └── providers/                # Providers React
│       ├── ThemeProvider.tsx
│       ├── QueryProvider.tsx
│       └── AuthProvider.tsx
│
├── config/                       # Configuraciones
│   ├── env.ts                    # Variables de entorno
│   ├── routes.ts                 # Definición de rutas
│   └── modules.ts                # Configuración de módulos
│
└── styles/                       # Estilos adicionales
    └── custom.css                # Estilos personalizados
```

---

## Principios de Arquitectura

### 1. Feature-Based Organization
Cada módulo de negocio es autónomo con sus propios:
- Componentes
- Hooks
- Services
- Store
- Types
- Utils

### 2. Separation of Concerns
- **Components**: Solo UI y presentación
- **Hooks**: Lógica de estado y efectos
- **Services**: Comunicación con APIs
- **Stores**: Estado global
- **Utils**: Funciones puras sin efectos

### 3. Type Safety
- TypeScript en TODO el proyecto
- Interfaces y types bien definidos
- Props tipadas estrictamente
- No usar `any` excepto casos justificados

### 4. Code Reusability
- Shared components para UI común
- Shared hooks para lógica común
- Shared services para APIs comunes
- Shared utils para funciones comunes

### 5. Scalability
- Fácil agregar nuevos módulos
- Fácil agregar nuevas rutas
- Fácil agregar nuevos componentes
- Convenciones claras y consistentes

---

## Stack Tecnológico

### Core
- **Next.js 16** - Framework React con App Router
- **React 19** - UI Library
- **TypeScript** - Type safety

### Estado
- **Zustand** - Estado global ligero y simple
- **React Query (TanStack Query)** - Server state management

### Estilos
- **Tailwind CSS 4** - Utility-first CSS
- **Shadcn/ui** - Componentes base
- **Framer Motion** - Animaciones

### Formularios
- **React Hook Form** - Gestión de formularios
- **Zod** - Validación de esquemas

### HTTP Client
- **Axios** - Cliente HTTP con interceptores

### Utilidades
- **Day.js** - Manejo de fechas
- **Lodash** - Utilidades funcionales
- **Lucide React** - Iconos

---

## Convenciones de Naming

### Archivos
- **Componentes**: PascalCase (e.g., `ProductForm.tsx`)
- **Hooks**: camelCase con prefijo `use` (e.g., `useProducts.ts`)
- **Services**: camelCase con sufijo `.service` (e.g., `product.service.ts`)
- **Stores**: camelCase con sufijo `Store` (e.g., `inventoryStore.ts`)
- **Types**: camelCase con sufijo `.types` (e.g., `product.types.ts`)
- **Utils**: camelCase con sufijo `.utils` (e.g., `format.utils.ts`)

### Código
- **Variables**: camelCase
- **Constantes**: UPPER_SNAKE_CASE
- **Tipos/Interfaces**: PascalCase
- **Funciones**: camelCase
- **Componentes**: PascalCase

---

## Patrones de Código

### 1. Component Pattern
```tsx
// ProductCard.tsx
import { Product } from '@/modules/inventory/types';

interface ProductCardProps {
  product: Product;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  return (
    // JSX
  );
}
```

### 2. Hook Pattern
```tsx
// useProducts.ts
import { useQuery } from '@tanstack/react-query';
import { productService } from '../services/product.service';

export function useProducts(companyId: string) {
  return useQuery({
    queryKey: ['products', companyId],
    queryFn: () => productService.getAll(companyId),
  });
}
```

### 3. Service Pattern
```tsx
// product.service.ts
import { apiClient } from '@/shared/services/api/client';
import { Product, CreateProductDto } from '../types';

export const productService = {
  getAll: async (companyId: string): Promise<Product[]> => {
    const { data } = await apiClient.get(`/companies/${companyId}/products`);
    return data;
  },

  create: async (companyId: string, dto: CreateProductDto): Promise<Product> => {
    const { data } = await apiClient.post(`/companies/${companyId}/products`, dto);
    return data;
  },

  // ...más métodos
};
```

### 4. Store Pattern (Zustand)
```tsx
// inventoryStore.ts
import { create } from 'zustand';
import { Product } from '../types';

interface InventoryState {
  products: Product[];
  selectedProduct: Product | null;
  setProducts: (products: Product[]) => void;
  setSelectedProduct: (product: Product | null) => void;
}

export const useInventoryStore = create<InventoryState>((set) => ({
  products: [],
  selectedProduct: null,
  setProducts: (products) => set({ products }),
  setSelectedProduct: (product) => set({ selectedProduct: product }),
}));
```

---

## Testing Strategy

### Niveles de Testing
1. **Unit Tests**: Funciones puras, utils, helpers
2. **Integration Tests**: Hooks con servicios, componentes con estado
3. **E2E Tests**: Flujos críticos de usuario (Playwright)

### Herramientas
- **Vitest** - Test runner
- **React Testing Library** - Testing de componentes
- **MSW** - Mocking de APIs
- **Playwright** - E2E testing

---

## Performance Optimizations

### Code Splitting
- Lazy loading de módulos con `next/dynamic`
- Suspense boundaries en rutas

### Caching
- React Query para cache de server state
- localStorage para datos persistentes
- Service Workers para assets

### Image Optimization
- `next/image` para imágenes optimizadas
- Lazy loading de imágenes

### Bundle Optimization
- Tree shaking automático
- Code splitting por rutas
- Análisis de bundle con `@next/bundle-analyzer`

---

## Security Best Practices

### Authentication
- JWT tokens en httpOnly cookies
- Refresh token rotation
- Session timeout

### Authorization
- Guards en rutas protegidas
- Permission-based UI rendering
- Backend validation always

### Data Validation
- Zod schemas para validación
- Sanitización de inputs
- XSS prevention

---

## Migration Plan

### Fase 1: Core Infrastructure (Semana 1-2)
- [ ] Configurar estructura de carpetas
- [ ] Configurar shared components (UI base)
- [ ] Configurar stores (auth, company, theme)
- [ ] Configurar services (API client)
- [ ] Configurar tipos globales
- [ ] Landing page completa

### Fase 2: Authentication Module (Semana 2)
- [ ] AuthModal mejorado
- [ ] Login/Register flows
- [ ] Password reset
- [ ] Email verification
- [ ] Auth guards

### Fase 3: Dashboard Core (Semana 3)
- [ ] Dashboard layout
- [ ] Sidebar navigation
- [ ] Header con user menu
- [ ] Dashboard home con widgets
- [ ] Notification system

### Fase 4: Inventory Module (Semana 3-4)
- [ ] Product CRUD
- [ ] Warehouse management
- [ ] Stock transfers
- [ ] Product search/filter

### Fase 5: Sales Module (Semana 4-5)
- [ ] Invoice CRUD
- [ ] Quote CRUD
- [ ] DIAN integration
- [ ] PDF generation

### Fase 6: Purchases & Expenses (Semana 5-6)
- [ ] Purchase orders
- [ ] Purchase invoices
- [ ] Expenses management
- [ ] Account mapping

### Fase 7: Accounting (Semana 6-7)
- [ ] Chart of accounts
- [ ] Journal entries
- [ ] General ledger
- [ ] Reports

### Fase 8: Advanced Modules (Semana 7-10)
- [ ] Banking
- [ ] Tax management
- [ ] HR/Payroll
- [ ] CRM
- [ ] Reports builder

---

## Success Metrics

### Code Quality
- 90%+ TypeScript coverage
- 80%+ test coverage (critical paths)
- 0 console errors en producción
- Lighthouse score >90

### Performance
- First Contentful Paint < 1.5s
- Time to Interactive < 3s
- Bundle size < 500KB (inicial)

### User Experience
- Mobile responsive 100%
- Accesibilidad WCAG 2.1 AA
- Loading states everywhere
- Error handling completo

---

## Next Steps

1. **Crear estructura de carpetas base**
2. **Migrar y mejorar shared components**
3. **Configurar API client y services**
4. **Migrar AuthModal y landing page**
5. **Crear Dashboard layout**
6. **Migrar módulos uno por uno**
