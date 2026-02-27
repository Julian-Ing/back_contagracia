# Chart of Accounts (Plan de Cuentas) - Backend

## Descripción

Módulo para gestionar el plan de cuentas contables con estructura jerárquica (árbol).

## Endpoints

### GET /api/chart-of-accounts

Lista las cuentas con búsqueda, filtro por tipo y paginación.

**Query Parameters:**

| Parámetro | Tipo   | Requerido | Default | Descripción                          |
|-----------|--------|-----------|---------|--------------------------------------|
| search    | string | No        | -       | Buscar por código o nombre (contains, case insensitive) |
| type      | string | No        | -       | Filtrar por tipo de cuenta (ASSET, LIABILITY, etc.) |
| page      | number | No        | 1       | Número de página                     |
| limit     | number | No        | 100     | Límite de resultados por página      |

**Response:**

```json
{
  "data": [
    {
      "code": "1",
      "name": "Activos",
      "type": "ASSET",
      "parent_code": null,
      "children": [
        {
          "code": "11",
          "name": "Activos Corrientes",
          "type": "ASSET",
          "parent_code": "1",
          "children": [],
          "_matched": true
        }
      ],
      "_matched": false
    }
  ],
  "total": 216,
  "filtered": 15,
  "page": 1,
  "limit": 100,
  "totalPages": 1
}
```

**Campos de respuesta:**

- `data`: Árbol jerárquico de cuentas
- `total`: Total de cuentas que coinciden con los filtros
- `filtered`: Cantidad de cuentas encontradas (solo cuando hay filtros)
- `page`: Página actual
- `limit`: Límite por página
- `totalPages`: Total de páginas
- `_matched`: Indica si la cuenta coincide directamente con la búsqueda (las cuentas padre se incluyen para mantener la jerarquía pero no están marcadas como matched)

### GET /api/chart-of-accounts/:code

Obtiene una cuenta específica por su código.

### POST /api/chart-of-accounts

Crea una nueva cuenta.

**Body:**

```json
{
  "code": "110505",
  "name": "Caja General"
}
```

**Validaciones:**
- El código debe contener solo dígitos
- No puede empezar con 0
- La longitud debe ser 1, 2, 4, 6, 8, 10... dígitos (PUC colombiano)
- El tipo se detecta automáticamente según el primer dígito
- El padre se detecta automáticamente según la estructura del código
- La cuenta padre debe existir previamente

**Response exitoso (201):**

```json
{
  "code": "110505",
  "name": "Caja General",
  "type": "ASSET",
  "parent_code": "1105",
  "is_active": true,
  "created_at": "2024-01-15T10:00:00.000Z",
  "updated_at": "2024-01-15T10:00:00.000Z"
}
```

**Errores posibles:**

| Status | Mensaje |
|--------|---------|
| 400    | El código debe contener solo dígitos |
| 400    | El código no puede empezar con 0 |
| 400    | La longitud del código debe ser 1, 2, 4, 6, 8, 10... dígitos |
| 400    | La cuenta padre {code} no existe. Debe crearla primero. |
| 409    | Ya existe una cuenta con este código |

### PUT /api/chart-of-accounts/:code

Actualiza una cuenta (solo el nombre).

**Body:**

```json
{
  "name": "Nuevo nombre"
}
```

**Response exitoso:**

```json
{
  "code": "110505",
  "name": "Nuevo nombre",
  "type": "ASSET",
  "parent_code": "1105",
  "is_active": true,
  "created_at": "2024-01-15T10:00:00.000Z",
  "updated_at": "2024-01-15T11:00:00.000Z"
}
```

### DELETE /api/chart-of-accounts/:code

Elimina una cuenta permanentemente.

**Validaciones:**
- No puede tener subcuentas activas
- No puede estar en uso en `accounting_config` (account_code, debit_account_code, credit_account_code)
- No puede tener movimientos en `journal_entry_items`

**Response exitoso:**

```json
{
  "message": "Cuenta eliminada exitosamente"
}
```

**Errores posibles:**

| Status | Mensaje |
|--------|---------|
| 404    | Cuenta no encontrada |
| 409    | No se puede eliminar: tiene subcuentas activas |
| 409    | No se puede eliminar: está en uso en configuración contable |
| 409    | No se puede eliminar: tiene movimientos contables |

**Response:**

```json
{
  "code": "1105",
  "name": "Caja",
  "type": "ASSET",
  "parent_code": "11",
  "is_active": true,
  "created_at": "2024-01-15T10:00:00.000Z",
  "updated_at": "2024-01-15T10:00:00.000Z",
  "parent": {
    "code": "11",
    "name": "Activos Corrientes",
    "type": "ASSET"
  },
  "children": []
}
```

## Estructura PUC Colombiano

El sistema sigue la estructura del Plan Único de Cuentas (PUC) colombiano:

### Longitudes válidas de código

Solo se permiten códigos con las siguientes longitudes: **1, 2, 4, 6, 8, 10, 12...** dígitos.

| Longitud | Nivel      | Ejemplo | Padre    |
|----------|------------|---------|----------|
| 1        | Clase      | 1       | (ninguno)|
| 2        | Grupo      | 11      | 1        |
| 4        | Cuenta     | 1105    | 11       |
| 6        | Subcuenta  | 110505  | 1105     |
| 8        | Auxiliar   | 11050501| 110505   |
| 10+      | Auxiliar   | ...     | -2 dígitos|

### Detección automática de padre

El padre se calcula automáticamente:
- Código de 1 dígito: sin padre
- Código de 2 dígitos: padre es el primer dígito
- Código de 4+ dígitos: padre es el código sin los últimos 2 dígitos

**Ejemplo:** Para crear la cuenta `110505`, el sistema:
1. Detecta que el padre es `1105`
2. Verifica que `1105` exista
3. Si no existe, retorna error indicando que debe crearla primero

### Detección automática de tipo

El tipo se detecta según el primer dígito del código:

## Tipos de Cuenta (AccountType)

| Valor             | Descripción          |
|-------------------|----------------------|
| ASSET             | Activo               |
| LIABILITY         | Pasivo               |
| EQUITY            | Patrimonio           |
| INCOME            | Ingreso              |
| EXPENSE           | Gasto                |
| COST              | Costo                |
| PRODUCTION_COST   | Costo de Producción  |
| DEBTOR_ACCOUNTS   | Cuentas Deudoras     |
| CREDITOR_ACCOUNTS | Cuentas Acreedoras   |

## Estructura de Archivos

```
accounting-service/
├── src/
│   ├── common/
│   │   └── guards/
│   │       ├── jwt.strategy.ts
│   │       └── jwt-auth.guard.ts
│   ├── modules/
│   │   └── chart-of-accounts/
│   │       ├── chart-of-accounts.controller.ts
│   │       ├── chart-of-accounts.service.ts
│   │       └── chart-of-accounts.module.ts
│   ├── app.module.ts
│   └── main.ts
├── .env
├── .env.example
└── package.json
```

## Configuración

**Puerto:** 3010

**Variables de entorno (.env):**

```env
DATABASE_MASTER_URL="postgresql://postgres:123@localhost:5433/contagracia_master?schema=public"
JWT_SECRET="dev-secret-key-change-in-production-256-bits-minimum"
PORT=3010
NODE_ENV="development"
```

## Lógica de Búsqueda

Cuando se aplican filtros (search o type):

1. Se buscan las cuentas que coinciden con los criterios
2. Se obtienen los códigos de las cuentas padre (ancestros) para mantener la jerarquía
3. Se construye el árbol incluyendo tanto las cuentas encontradas como sus ancestros
4. Las cuentas que coinciden directamente se marcan con `_matched: true`

Esto permite mostrar la estructura jerárquica completa mientras se resaltan las cuentas que coinciden con la búsqueda.
