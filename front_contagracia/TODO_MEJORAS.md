# TODO: Mejoras Pendientes

## 1. Migrar constantes de formularios a Prisma Schema

**Descripción**: Los datos de los selectores del formulario de registro (sectores, departamentos, regímenes, etc.) actualmente están hardcodeados en el componente. Deben moverse a la base de datos.

**Ubicación actual**:
- `src/modules/auth/components/RegisterCompanyForm.tsx` (arrays hardcodeados)

**Solución propuesta**:
- Crear tablas de catálogo en `schema-master.prisma`:
  - `economic_sectors` (sectores económicos)
  - `departments` (departamentos de Colombia)
  - `tax_regimes` (regímenes tributarios)
  - `tax_responsibilities` (responsabilidades fiscales)
  - `entity_types` (tipos de entidad)
  - `document_types` (tipos de documento)

**Beneficios**:
- Datos centralizados y mantenibles desde el backend
- Posibilidad de agregar/editar opciones sin cambiar código
- Validación consistente entre frontend y backend
- Internacionalización futura más fácil

**Endpoints necesarios**:
- `GET /catalogs/sectors`
- `GET /catalogs/departments`
- `GET /catalogs/tax-regimes`
- `GET /catalogs/tax-responsibilities`
- etc.

**Prioridad**: Media (después de completar módulo de auth)

---

## 2. Otras mejoras pendientes

(Agregar aquí futuras mejoras identificadas)
