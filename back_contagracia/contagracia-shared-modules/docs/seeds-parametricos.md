# Seeds Paramétricos - Master Database

Datos paramétricos DIAN migrados desde el sistema anterior (Supabase/MySQL) al nuevo sistema con Prisma ORM.

## Archivos de datos (`prisma/seeds/`)

| Archivo | Modelo | Registros | Fuente | Notas |
|---|---|---|---|---|
| `countries.ts` | Country | 249 | Supabase | IDs exactos. Colombia = id '46' |
| `departments.ts` | Department | 33 | Supabase | Departamentos de Colombia, country_id '46' |
| `municipalities.ts` | Municipality | 1,122 | Supabase (JSON) | Incluye dian_code (codefacturador) |
| `typeDocumentIdentifications.ts` | TypeDocumentIdentification | 12 | Supabase | RC, TI, CC, CE, NIT, Pasaporte, PEP, PPT |
| `typeOrganizations.ts` | TypeOrganization | 2 | Supabase | Persona Jurídica (1), Persona Natural (2) |
| `typeRegimes.ts` | TypeRegime | 2 | Supabase | Responsable IVA (48), No Responsable IVA (49) |
| `typeLiabilities.ts` | TypeLiability | 5 | Supabase | Gran contribuyente, Autorretenedor, Agente retención IVA, SIMPLE, No responsable |
| `productUnits.ts` | ProductUnit | 10 | MySQL | IDs = code DIAN. Deduplicados (code '70' repetido) |
| `paymentMethods.ts` | PaymentMethod | 75 | MySQL | Mantiene campo code por valor 'ZZZ' |
| `taxRates.ts` | TaxRate | 6 | Manual | IVA 19/5/0%, ReteICA 0.5%, ReteIVA 15%, ReteFuente 2.5% |
| `integrations.ts` | Integration + IntegrationKey | 1 + 7 | Manual | SMTP con 7 keys: host, port, secure, user, password, from_email, from_name |

## Seeds previamente existentes (en `seed.ts`)

| Datos | Registros |
|---|---|
| Modules | 33 |
| System Actions | 637 |
| Plans | 4 (Trial, Básico, Profesional, Empresarial) |
| TaxTypes | 21 |
| Banks | 32 |
| Integrations | 1 (SMTP) |
| Super Admin | 1 (admin@contagracia.com) |

## Notas

- Todos los IDs son exactos del sistema anterior (datos DIAN), no UUIDs autogenerados.
- El seed usa `upsert` con `where: { id }` para ser idempotente.
- Base de datos: `localhost:5432` → `contagracia_master`.
- Ejecutar: `npx prisma db seed` desde `contagracia-shared-modules`.
