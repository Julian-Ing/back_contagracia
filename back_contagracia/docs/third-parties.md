# Módulo de Terceros

## Descripción
Gestión de terceros: clientes, proveedores, empleados, entidades de seguridad social.

## API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /third-parties | Listar con filtros y paginación |
| GET | /third-parties/:id | Obtener por ID |
| GET | /third-parties/exists/:nit | Verificar si existe |
| POST | /third-parties | Crear tercero |
| PUT | /third-parties/:id | Actualizar tercero |
| DELETE | /third-parties/:id | Desactivar tercero |

## Query Parameters (GET /third-parties)

| Param | Tipo | Descripción |
|-------|------|-------------|
| search | string | Buscar por nombre, NIT o email |
| role | string | Filtrar por rol |
| is_active | boolean | Filtrar por estado |
| page | number | Página (default: 1) |
| limit | number | Límite (default: 50) |

## Roles

| Rol | Descripción | Seleccionable |
|-----|-------------|---------------|
| CLIENT | Cliente | Sí |
| SUPPLIER | Proveedor | Sí |
| EMPLOYEE | Empleado | No (RRHH) |
| CONTACT | Contacto | No (CRM) |
| EPS | EPS | Sí |
| PENSION_FUND | Pensiones | Sí |
| ARL | ARL | Sí |
| COMPENSATION_FUND | Caja Compensación | Sí |
| SEVERANCE_FUND | Cesantías | Sí |
| SENA | Servicio Nacional de Aprendizaje | Sí |
| ICBF | Instituto Colombiano de Bienestar Familiar | Sí |
| OTHER | Otro | Sí |

## Cuentas Contables
- CxC: Prefijo `13`
- CxP: Prefijo `2`

## Campos Principales

```typescript
{
  name: string;                    // Razón social o nombre completo
  identification_number: string;   // NIT o cédula
  dv: string;                      // Dígito verificación
  type_document_identification_id: string;
  type_organization_id: string;    // Persona natural/jurídica
  type_regime_id: string;
  type_liability_id: string;
  roles: ThirdPartyRole[];
  department_id: string;
  municipality_id: string;
  email: string;
  phone: string;
  address: string;
  first_name: string;              // Solo persona natural
  second_name: string;
  first_surname: string;
  second_surname: string;
  cxc_account_code: string;        // Cuenta CxC
  cxp_account_code: string;        // Cuenta CxP
}
```

## Permisos
- `third_parties.view`
- `third_parties.create`
- `third_parties.edit`
