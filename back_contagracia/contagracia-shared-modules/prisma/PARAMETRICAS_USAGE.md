# Guía de Uso: Tablas Paramétricas

## 📋 Resumen

Las tablas paramétricas contienen datos oficiales DIAN y catálogos compartidos entre todas las empresas. Estas tablas están en **Master DB** y se acceden via API o servicios compartidos.

---

## 🏗️ Arquitectura

### Master DB (Paramétricas)
```
Master DB
├── Countries           → Países
├── Departments         → Departamentos (33)
├── Municipalities      → Municipios (~1100)
├── TypeDocumentIdentification  → Tipos de documento DIAN
├── TypeOrganization    → Tipos de organización DIAN
├── TypeRegime          → Regímenes tributarios DIAN
├── TypeLiability       → Responsabilidades fiscales DIAN
├── EconomicActivity    → Actividades económicas CIIU
├── Banks               → Bancos
├── PaymentMethods      → Métodos de pago DIAN
├── ProductUnits        → Unidades de medida DIAN
└── TaxRates            → Tarifas de IVA
```

### Tenant DB (Referencias)
```
Tenant DB
├── Tercero
│   ├── type_document_identification_id  → UUID (Master DB)
│   ├── type_organization_id             → UUID (Master DB)
│   ├── municipality_id                  → UUID (Master DB)
│   └── ...
├── Invoice
├── Product
└── ...
```

**⚠️ IMPORTANTE**: Tenant DB NO contiene las tablas paramétricas, solo guarda UUIDs.

---

## 🔄 Flujo de Datos

### 1. Registrar Empresa (Backend)

```typescript
// auth.service.ts
async registerCompany(dto: RegisterCompanyDto) {
  // 1. Validar que los IDs existen en Master DB
  const municipality = await this.prismaM Master.municipality.findUnique({
    where: { id: dto.municipality_id }
  });

  if (!municipality) {
    throw new BadRequestException('Municipio inválido');
  }

  // 2. Crear empresa en Master DB con FKs
  const company = await this.prismaMaster.company.create({
    data: {
      company_name: dto.company_name,
      nit: dto.nit,
      dv: dto.dv,
      municipality_id: dto.municipality_id,           // FK
      type_organization_id: dto.type_organization_id, // FK
      type_regime_id: dto.type_regime_id,             // FK
      ...
    }
  });

  return company;
}
```

### 2. Frontend: Consumir Catálogos

```typescript
// Frontend: Cargar formulario de registro
useEffect(() => {
  // Cargar municipios desde API de catálogos
  const fetchMunicipalities = async () => {
    const response = await axios.get('/api/catalogs/municipalities');
    setMunicipalities(response.data);
  };

  fetchMunicipalities();
}, []);

// Renderizar select
<Select
  options={municipalities.map(m => ({
    value: m.id,
    label: `${m.name} (${m.department.name})`
  }))}
  onChange={(value) => setFormData({ ...formData, municipality_id: value })}
/>
```

### 3. Mostrar Datos (Resolver Nombres)

```typescript
// Backend: Retornar empresa con datos completos
async getCompany(companyId: string) {
  const company = await this.prismaMaster.company.findUnique({
    where: { id: companyId },
    include: {
      municipality: {
        include: { department: { include: { country: true } } }
      },
      type_organization: true,
      type_regime: true,
      type_liability: true,
      economic_activity: true,
    }
  });

  return {
    id: company.id,
    name: company.company_name,
    nit: company.nit,
    municipality: company.municipality?.name,
    department: company.municipality?.department?.name,
    regime: company.type_regime?.name,
    ...
  };
}
```

---

## 🚀 API de Catálogos

### Endpoints Necesarios

Crear un `CatalogController` en **auth-service** o crear un **catalog-service** separado:

```typescript
@Controller('catalogs')
export class CatalogController {

  // === GEOLOCALIZACIÓN ===

  @Get('countries')
  @UseCache('catalogs:countries', 86400) // Cache 24h
  async getCountries() {
    return this.catalogService.getCountries();
  }

  @Get('departments')
  @UseCache('catalogs:departments', 86400)
  async getDepartments(@Query('country_id') countryId?: string) {
    return this.catalogService.getDepartments(countryId);
  }

  @Get('municipalities')
  @UseCache('catalogs:municipalities', 86400)
  async getMunicipalities(@Query('department_id') departmentId?: string) {
    return this.catalogService.getMunicipalities(departmentId);
  }

  // === TIPOS DIAN ===

  @Get('document-types')
  @UseCache('catalogs:document-types', 86400)
  async getDocumentTypes() {
    return this.catalogService.getDocumentTypes();
  }

  @Get('organization-types')
  @UseCache('catalogs:organization-types', 86400)
  async getOrganizationTypes() {
    return this.catalogService.getOrganizationTypes();
  }

  @Get('regimes')
  @UseCache('catalogs:regimes', 86400)
  async getRegimes() {
    return this.catalogService.getRegimes();
  }

  @Get('liabilities')
  @UseCache('catalogs:liabilities', 86400)
  async getLiabilities() {
    return this.catalogService.getLiabilities();
  }

  @Get('economic-activities')
  @UseCache('catalogs:economic-activities', 86400)
  async getEconomicActivities() {
    return this.catalogService.getEconomicActivities();
  }

  // === COMPLEMENTARIOS ===

  @Get('banks')
  @UseCache('catalogs:banks', 86400)
  async getBanks() {
    return this.catalogService.getBanks();
  }

  @Get('payment-methods')
  @UseCache('catalogs:payment-methods', 86400)
  async getPaymentMethods() {
    return this.catalogService.getPaymentMethods();
  }

  @Get('product-units')
  @UseCache('catalogs:product-units', 86400)
  async getProductUnits() {
    return this.catalogService.getProductUnits();
  }

  @Get('tax-rates')
  @UseCache('catalogs:tax-rates', 86400)
  async getTaxRates() {
    return this.catalogService.getTaxRates();
  }
}
```

### Servicio con Caché

```typescript
@Injectable()
export class CatalogService {
  constructor(
    @Inject('PRISMA_MASTER') private prisma: PrismaClientMaster,
    private redisService: RedisService
  ) {}

  async getMunicipalities(departmentId?: string) {
    const cacheKey = `catalogs:municipalities:${departmentId || 'all'}`;

    // Intentar obtener del cache
    const cached = await this.redisService.get(cacheKey);
    if (cached) return cached;

    // Consultar DB
    const municipalities = await this.prisma.municipality.findMany({
      where: departmentId ? { department_id: departmentId } : undefined,
      include: {
        department: {
          include: { country: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Guardar en cache (24 horas)
    await this.redisService.set(cacheKey, municipalities, 86400);

    return municipalities;
  }

  async getDocumentTypes() {
    const cached = await this.redisService.get('catalogs:document-types');
    if (cached) return cached;

    const types = await this.prisma.typeDocumentIdentification.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' }
    });

    await this.redisService.set('catalogs:document-types', types, 86400);
    return types;
  }

  // ... similar para otros catálogos
}
```

---

## 📦 Seeds (Datos Iniciales)

### Estructura de Seeds

```
prisma/
├── seeds/
│   ├── 01-countries.seed.ts        → Colombia
│   ├── 02-departments.seed.ts     → 33 departamentos
│   ├── 03-municipalities.seed.ts  → ~1100 municipios
│   ├── 04-document-types.seed.ts  → Tipos de documento DIAN
│   ├── 05-organizations.seed.ts   → Persona jurídica/natural
│   ├── 06-regimes.seed.ts         → Regímenes tributarios
│   ├── 07-liabilities.seed.ts     → Responsabilidades fiscales
│   ├── 08-activities.seed.ts      → Actividades económicas principales
│   ├── 09-banks.seed.ts           → Bancos principales de Colombia
│   ├── 10-payment-methods.seed.ts → Métodos de pago DIAN
│   ├── 11-product-units.seed.ts   → Unidades de medida
│   └── 12-tax-rates.seed.ts       → Tarifas de IVA
└── seed.ts
```

### seed.ts Principal

```typescript
import { PrismaClient } from '@prisma/client-master';
import { seedCountries } from './seeds/01-countries.seed';
import { seedDepartments } from './seeds/02-departments.seed';
import { seedMunicipalities } from './seeds/03-municipalities.seed';
// ... otros imports

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Orden importante: países → departamentos → municipios
  await seedCountries(prisma);
  await seedDepartments(prisma);
  await seedMunicipalities(prisma);

  await seedDocumentTypes(prisma);
  await seedOrganizations(prisma);
  await seedRegimes(prisma);
  await seedLiabilities(prisma);
  await seedEconomicActivities(prisma);

  await seedBanks(prisma);
  await seedPaymentMethods(prisma);
  await seedProductUnits(prisma);
  await seedTaxRates(prisma);

  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## 🔍 Casos de Uso

### 1. Registrar Tercero (Tenant DB)

```typescript
// En tenant DB, solo guardamos IDs
const tercero = await prismaTenant.tercero.create({
  data: {
    name: 'Juan Pérez',
    identification_number: '123456789',
    type_document_identification_id: 'uuid-cc',  // UUID desde Master
    type_organization_id: 'uuid-persona-natural',
    municipality_id: 'uuid-medellin',
    roles: ['CLIENT', 'SUPPLIER']  // ENUM
  }
});
```

### 2. Mostrar Tercero con Nombres Resueltos

```typescript
// Backend resuelve nombres desde Master DB
async getTercero(terceroId: string, companyId: string) {
  const company = await this.getCompanyById(companyId);
  const prismaTenant = this.getTenantPrisma(company.database_url);

  const tercero = await prismaTenant.tercero.findUnique({
    where: { id: terceroId }
  });

  // Resolver nombres desde Master DB
  const [docType, orgType, municipality] = await Promise.all([
    this.prismaMaster.typeDocumentIdentification.findUnique({
      where: { id: tercero.type_document_identification_id }
    }),
    this.prismaMaster.typeOrganization.findUnique({
      where: { id: tercero.type_organization_id }
    }),
    this.prismaMaster.municipality.findUnique({
      where: { id: tercero.municipality_id },
      include: { department: true }
    })
  ]);

  return {
    ...tercero,
    document_type_name: docType?.name,
    organization_type_name: orgType?.name,
    municipality_name: municipality?.name,
    department_name: municipality?.department?.name,
  };
}
```

---

## 🎯 Ventajas del Modelo

1. ✅ **Actualización centralizada**: Cambio DIAN → 1 update en Master DB
2. ✅ **Tenant DBs livianos**: Solo IDs, no datos duplicados
3. ✅ **Cacheable**: Redis cache global, no por empresa
4. ✅ **Consistencia**: Todas las empresas usan mismos códigos oficiales
5. ✅ **Escalable**: Agregar nueva empresa = copiar schema, no datos

---

## ⚠️ Consideraciones

### Validación

```typescript
// Siempre validar que los IDs existen antes de guardar
async validateCatalogIds(dto: any) {
  const [municipality, docType] = await Promise.all([
    this.prismaMaster.municipality.findUnique({
      where: { id: dto.municipality_id }
    }),
    this.prismaMaster.typeDocumentIdentification.findUnique({
      where: { id: dto.type_document_identification_id }
    })
  ]);

  if (!municipality) {
    throw new BadRequestException('Municipio inválido');
  }

  if (!docType) {
    throw new BadRequestException('Tipo de documento inválido');
  }
}
```

### Cache Invalidation

```typescript
// Si se actualiza una paramétrica (raro), invalidar cache
async updateMunicipality(id: string, data: any) {
  await this.prismaMaster.municipality.update({
    where: { id },
    data
  });

  // Invalidar caches relacionados
  await this.redisService.del('catalogs:municipalities:all');
  await this.redisService.del(`catalogs:municipalities:${data.department_id}`);
}
```

---

## 📝 Próximos Pasos

1. ✅ Schemas actualizados
2. ⏳ Crear seeds con datos iniciales
3. ⏳ Crear CatalogService y CatalogController
4. ⏳ Actualizar RegisterCompanyDto con nuevos campos
5. ⏳ Actualizar auth.service.ts para usar paramétricas
6. ⏳ Frontend: Actualizar formularios para consumir catálogos
7. ⏳ Documentar endpoints en Swagger
