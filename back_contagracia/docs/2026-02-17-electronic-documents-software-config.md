# Configuración de Software - Electronic Documents

**Fecha:** 2026-02-17

## Resumen

Endpoints para configurar software de facturación y nómina en DIAN. Los datos se envían al API DIAN y se guardan en `CompanySetting` del tenant.

## Endpoints

### 1. Configurar Software de Facturación

**`PATCH /software/invoice`**

**Body:**
```json
{
  "software_id": "string (UUID)",
  "software_pin": number (5 dígitos)
}
```

**Qué hace:**
1. Valida que el PIN sea de 5 dígitos (10000-99999)
2. Obtiene el token DIAN de `CompanySetting` (category='dian', key='api_dian_token')
3. Envía `PUT /api/ubl2.1/config/software` al API DIAN con `{ id, pin }`
4. Guarda en `CompanySetting`:
   - `invoice_software_id`
   - `invoice_software_pin`

**Response:**
```json
{
  "success": true,
  "message": "Software de facturación configurado exitosamente"
}
```

**Errores:**
- `BadRequestException` si no hay token DIAN (falta sincronizar empresa)
- `BadRequestException` si PIN no es de 5 dígitos
- `BadRequestException` si API DIAN falla

---

### 2. Configurar Software de Nómina

**`PATCH /software/payroll`**

**Body:**
```json
{
  "payroll_id": "string (UUID)",
  "payroll_pin": number (5 dígitos)
}
```

**Qué hace:**
1. Valida que el PIN sea de 5 dígitos (10000-99999)
2. Obtiene el token DIAN de `CompanySetting`
3. Envía `PUT /api/ubl2.1/config/softwarepayroll` al API DIAN con `{ idpayroll, pinpayroll }`
4. Guarda en `CompanySetting`:
   - `payroll_software_id`
   - `payroll_software_pin`

**Response:**
```json
{
  "success": true,
  "message": "Software de nómina configurado exitosamente"
}
```

**Errores:**
- `BadRequestException` si no hay token DIAN
- `BadRequestException` si PIN no es de 5 dígitos
- `BadRequestException` si API DIAN falla

---

## Requisitos Previos

- Empresa sincronizada con DIAN (token guardado en `CompanySetting`)
- Plan con módulo `electronic_documents`

---

## Notas

- Los endpoints NO tienen `@RequirePermissions` aún (decorador en desarrollo)
- El PIN se valida localmente (5 dígitos) antes de enviar a DIAN
- Ambos se guardan como STRING en CompanySetting pero se envían como NUMBER al API
- El `test_set_id` se agrega DESPUÉS (para habilitar nómina)
