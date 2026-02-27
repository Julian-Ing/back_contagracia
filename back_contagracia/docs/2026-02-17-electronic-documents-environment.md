# Cambio de Ambiente - Electronic Documents

**Fecha:** 2026-02-17

## Resumen

4 endpoints para cambiar ambiente de facturación y nómina entre HABILITACIÓN (2) y PRODUCCIÓN (1). Los cambios se envían al API DIAN y se guardan en `CompanySetting` del tenant.

## Endpoints

### 1. Facturación → HABILITACIÓN

**`PATCH /environment/invoice/habilitation`**

Cambia facturación a ambiente de HABILITACIÓN (2).

**Response:**
```json
{
  "success": true,
  "message": "Facturación en HABILITACIÓN"
}
```

---

### 2. Facturación → PRODUCCIÓN

**`PATCH /environment/invoice/production`**

Cambia facturación a ambiente de PRODUCCIÓN (1).

**Response:**
```json
{
  "success": true,
  "message": "Facturación en PRODUCCIÓN"
}
```

---

### 3. Nómina → HABILITACIÓN

**`PATCH /environment/payroll/habilitation`**

Cambia nómina a ambiente de HABILITACIÓN (2).

**Response:**
```json
{
  "success": true,
  "message": "Nómina en HABILITACIÓN"
}
```

---

### 4. Nómina → PRODUCCIÓN

**`PATCH /environment/payroll/production`**

Cambia nómina a ambiente de PRODUCCIÓN (1).

**Response:**
```json
{
  "success": true,
  "message": "Nómina en PRODUCCIÓN"
}
```

---

## Lógica

Cada endpoint:
1. Obtiene los valores actuales de `CompanySetting` (invoice_dian_environment, payroll_dian_environment)
2. Cambia el que corresponda (invoice o payroll) al valor solicitado (1 o 2)
3. Obtiene el token DIAN de `CompanySetting`
4. Envía `PUT /api/ubl2.1/config/environment` al API DIAN con:
   ```json
   {
     "type_environment_id": <invoice actual o nuevo>,
     "payroll_type_environment_id": <payroll actual o nuevo>,
     "eqdocs_type_environment_id": 2
   }
   ```
5. Guarda el nuevo valor en `CompanySetting`

## Errores

- `BadRequestException` si no hay token DIAN
- `BadRequestException` si API DIAN falla

## Requisitos Previos

- Empresa sincronizada con DIAN (token en `CompanySetting`)
- Plan con módulo `electronic_documents`
