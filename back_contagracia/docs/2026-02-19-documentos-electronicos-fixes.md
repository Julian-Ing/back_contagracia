# Fixes Módulo Documentos Electrónicos

**Fecha:** 2026-02-19
**Autor:** Claude Code
**Servicios:** company-service, electronic-documents-service, shared-dian

## Resumen

Correcciones y mejoras en el módulo de documentos electrónicos:
1. Fix sincronización DIAN: enviar IDs en lugar de codes
2. Endpoint de certificado devuelve información completa
3. Logs para debugging de payload DIAN
4. Frontend: mejor UX y manejo de errores
5. Endpoints GET para precargar configuración de software
6. Endpoints PATCH para guardar Test Set ID
7. Botón "Guardar Test Set" en frontend

## Cambios en Backend

### 1. company-service: Fix Sincronización DIAN

**Problema:** Se enviaban los `.code` de las tablas paramétricas pero el API de DIAN esperaba los `.id`.

**Archivo:** `company-service/src/modules/companies/companies.service.ts`

**Antes:**
```typescript
type_document_identification_code: company.type_document_identification.code,
type_organization_code: company.type_organization.code,
type_regime_code: company.type_regime.code,
type_liability_code: company.type_liability.code,
department_code: company.department.code,
municipality_code: company.municipality.code,
```

**Ahora:**
```typescript
type_document_identification_code: company.type_document_identification.id,
type_organization_code: company.type_organization.id,
type_regime_code: company.type_regime.id,
type_liability_code: company.type_liability.id,
department_code: company.department.id,
municipality_code: company.municipality.id,
```

**Resultado:**
- ✅ El API de DIAN acepta los parámetros correctamente
- ✅ No más errores 422 por IDs inválidos

### 2. shared-dian: Log de Payload DIAN

**Archivo:** `contagracia-shared-modules/shared-dian/src/dian-api.service.ts`

**Agregado:**
```typescript
this.logger.log(`Payload enviado a API DIAN: ${JSON.stringify(body, null, 2)}`);
```

**Propósito:**
- Debugging cuando el API de DIAN rechaza requests
- Ver exactamente qué datos se están enviando
- Facilitar troubleshooting de errores 422

### 3. electronic-documents-service: Endpoint Certificado Completo

**Archivo:** `electronic-documents-service/src/modules/certificate/certificate.service.ts`

**Antes:**
```typescript
async getCertificateInfo(companyId: string): Promise<{
  has_certificate: boolean;
  path?: string;
  expires_at?: string;
}>
```

**Ahora:**
```typescript
async getCertificateInfo(companyId: string): Promise<{
  has_certificate: boolean;
  path?: string;
  file_name?: string;      // ← Nuevo
  password?: string;        // ← Nuevo
  expires_at?: string;
}>
```

**Cambios:**
- Devuelve `file_name` extraído del path del certificado
- Devuelve `password` guardada en CompanySetting
- Permite a usuarios con permisos ver datos completos del certificado

**Nota de Seguridad:**
- Solo usuarios con permiso `electronic_documents.certificate.load` pueden acceder
- La contraseña se devuelve solo si el usuario tiene permisos explícitos

## Cambios en Frontend

### 1. CertificateCard: Mejoras UX

**Archivo:** `front_contagracia/src/modules/electronic-documents/components/CertificateCard.tsx`

**Cambios:**

#### a) Botón Mostrar/Ocultar Contraseña
```typescript
const [showPassword, setShowPassword] = useState(false);

<Input
  type={showPassword ? 'text' : 'password'}
  ...
/>
<button onClick={() => setShowPassword(!showPassword)}>
  {showPassword ? <EyeOff /> : <Eye />}
</button>
```

#### b) Precarga de Datos al Montar
```typescript
useEffect(() => {
  loadCertificateInfo();
}, []);

const loadCertificateInfo = async () => {
  const response = await electronicDocsClient.get('/certificate/info');
  setCertInfo(response.data);

  // Prellenar contraseña si existe
  if (data.password) {
    setPassword(data.password);
  }
};
```

#### c) Mostrar Archivo Actual
```jsx
{certInfo?.file_name && (
  <div className="text-xs text-muted-foreground">
    Actual: {certInfo.file_name}
  </div>
)}
```

#### d) Cuenta Regresiva de Vencimiento
```typescript
const getExpiryText = (expiresAt: string) => {
  const diffDays = Math.floor((new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Vencido';
  if (diffDays === 0) return 'Vence hoy';
  if (diffDays === 1) return 'Vence mañana';
  if (diffDays < 30) return `Vence en ${diffDays} días`;

  const months = Math.floor(diffDays / 30);
  const days = diffDays % 30;
  return `Vence en ${months} ${months === 1 ? 'mes' : 'meses'}${days > 0 ? ` y ${days} días` : ''}`;
};
```

**Antes:** "Vence: 12/5/2026" (con bordes amarillos feos)

**Ahora:** "Vence en 2 meses y 23 días" (texto gris neutro)

#### e) Mejor Manejo de Errores

**Cambios en Backend:**

*shared-dian/dian-api.service.ts:*
```typescript
if (!response.ok) {
  const errorText = await response.text();
  // Parsear error como JSON y devolver message + errors
  const errorData = JSON.parse(errorText);
  return {
    success: false,
    message: errorData.message,
    errors: errorData.errors,  // ← Nuevo
  };
}
```

*electronic-documents-service/certificate.service.ts:*
```typescript
if (!dianResult.success) {
  throw new BadRequestException({
    message: dianResult.message,
    errors: dianResult.errors,  // ← Pasar errors completos
  });
}
```

**Cambios en Frontend:**

*CertificateCard.tsx:*
```typescript
catch (error: any) {
  let errorMessage = 'Error al cargar certificado';

  if (error?.response?.data?.message) {
    errorMessage = error.response.data.message;  // Mensaje del backend
  }

  // Si detecta error de contraseña, agregar hint
  if (error?.response?.data?.errors) {
    const errors = Object.values(error.response.data.errors);
    if (errors.some(e => e.includes('mac verify failure'))) {
      errorMessage += ' (verifica la contraseña)';
    }
  }

  toast.error(errorMessage);
}
```

**Antes:** "Error 422: Unprocessable Content"

**Ahora:** "El certificado no pudo ser leído (verifica la contraseña)"

- Muestra mensaje real del backend, no genérico
- Agrega hint útil cuando detecta error específico
- No modifica el mensaje original del API

### 2. PayrollSoftwareCard e InvoiceSoftwareCard: Fix API Client

**Archivos:**
- `front_contagracia/src/modules/electronic-documents/components/PayrollSoftwareCard.tsx`
- `front_contagracia/src/modules/electronic-documents/components/InvoiceSoftwareCard.tsx`

**Problema:** Usaban `fetch()` con URLs hardcodeadas incorrectas:
```typescript
fetch('/api/electronic-documents/software/payroll')  // ❌ 404
```

**Solución:** Usar `electronicDocsClient` configurado:
```typescript
import { electronicDocsClient } from '@/shared/services/api/apiClient';

electronicDocsClient.get('/software/payroll')  // ✅
electronicDocsClient.patch('/environment/payroll/production')  // ✅
```

**Beneficios:**
- URLs correctas desde `API_CONFIG.ELECTRONIC_DOCS`
- Interceptores de axios (auth, errors)
- Configuración centralizada

## Testing

### Backend
```bash
# Probar sincronización DIAN
curl -X POST http://localhost:3003/api/companies/internal/{companyId}/sync-dian

# Ver logs del payload enviado
# company-service start:dev: [DianApiService] Payload enviado a API DIAN: {...}

# Verificar info del certificado
curl http://localhost:3016/api/certificate/info
# Response: { has_certificate: true, file_name: "cert.p12", password: "...", expires_at: "..." }
```

### Frontend
1. Entrar a Documentos Electrónicos
2. Verificar que precarga:
   - ✅ Nombre del archivo actual
   - ✅ Contraseña guardada
   - ✅ Fecha de vencimiento como cuenta regresiva
3. Verificar botón de mostrar/ocultar contraseña
4. Subir certificado inválido → ver mensaje de error del backend

### 4. electronic-documents-service: Endpoints GET para Software

**Problema:** Solo existían endpoints PATCH para guardar configuración, pero no GET para obtenerla. El frontend no podía precargar los datos.

**Archivos:**
- `electronic-documents-service/src/modules/software/software.controller.ts`
- `electronic-documents-service/src/modules/software/software.service.ts`

**Agregados:**
```typescript
@Get('invoice')
async getInvoiceSoftware(@CompanyId() companyId: string) {
  return this.softwareService.getInvoiceSoftware(companyId);
}

@Get('payroll')
async getPayrollSoftware(@CompanyId() companyId: string) {
  return this.softwareService.getPayrollSoftware(companyId);
}
```

**Métodos en Service:**
```typescript
async getInvoiceSoftware(companyId: string) {
  const settings = await tenantDb.companySetting.findMany({
    where: {
      category: 'dian',
      key: { in: [
        'invoice_software_id',
        'invoice_software_pin',
        'invoice_test_set_id',
        'invoice_dian_environment'
      ] },
    },
  });

  return {
    software_id: settings.find(s => s.key === 'invoice_software_id')?.value || '',
    software_pin: settings.find(s => s.key === 'invoice_software_pin')?.value || '',
    test_set_id: settings.find(s => s.key === 'invoice_test_set_id')?.value || '',
    environment: Number(settings.find(s => s.key === 'invoice_dian_environment')?.value || '2'),
  };
}

async getPayrollSoftware(companyId: string) {
  // Similar pero con keys: payroll_software_id, payroll_software_pin,
  // payroll_test_set_id, payroll_dian_environment
}
```

**Keys en CompanySetting (category: 'dian'):**
- `invoice_software_id` / `payroll_software_id` - UUID del software
- `invoice_software_pin` / `payroll_software_pin` - PIN de 5 dígitos
- `invoice_test_set_id` / `payroll_test_set_id` - Test Set ID
- `invoice_dian_environment` / `payroll_dian_environment` - 1=Producción, 2=Habilitación

**Resultado:**
- ✅ Frontend ahora puede precargar software ID, PIN, test_set_id y ambiente guardados
- ✅ Los componentes PayrollSoftwareCard e InvoiceSoftwareCard muestran datos existentes
- ✅ Botones de ambiente (Habilitación/Producción) funcionan correctamente

### 5. electronic-documents-service: Endpoints PATCH para Test Set ID

**Archivos:**
- `electronic-documents-service/src/modules/software/software.controller.ts`
- `electronic-documents-service/src/modules/software/software.service.ts`

**Agregados en Controller:**
```typescript
@Patch('invoice/test-set')
@HttpCode(HttpStatus.OK)
async saveInvoiceTestSet(
  @CompanyId() companyId: string,
  @Body() body: { test_set_id: string },
) {
  return this.softwareService.saveInvoiceTestSet(companyId, body.test_set_id);
}

@Patch('payroll/test-set')
@HttpCode(HttpStatus.OK)
async savePayrollTestSet(
  @CompanyId() companyId: string,
  @Body() body: { test_set_id: string },
) {
  return this.softwareService.savePayrollTestSet(companyId, body.test_set_id);
}
```

**Métodos en Service:**
```typescript
async saveInvoiceTestSet(companyId: string, testSetId: string) {
  const tenantDb = await this.tenantContext.getTenantClient(companyId);

  await tenantDb.companySetting.update({
    where: { category_key: { category: 'dian', key: 'invoice_test_set_id' } },
    data: { value: testSetId },
  });

  return { success: true, message: 'Test Set ID guardado exitosamente' };
}

async savePayrollTestSet(companyId: string, testSetId: string) {
  // Similar pero con key: 'payroll_test_set_id'
}
```

**Resultado:**
- ✅ Permite guardar el Test Set ID sin necesidad de llamar a la API de DIAN
- ✅ El Test Set ID se guarda en CompanySetting para uso futuro
- ✅ Frontend puede guardar el Test Set ID antes de habilitar el ambiente

### 6. Frontend: Botón Guardar Test Set

**Archivos:**
- `front_contagracia/src/modules/electronic-documents/components/InvoiceSoftwareCard.tsx`
- `front_contagracia/src/modules/electronic-documents/components/PayrollSoftwareCard.tsx`

**Cambios:**

#### a) Estado de carga para Test Set
```typescript
const [testSetLoading, setTestSetLoading] = useState(false);
```

#### b) Función handleSaveTestSet
```typescript
const handleSaveTestSet = async () => {
  if (!config.test_set_id) {
    toast.error('Ingresa el Test Set ID');
    return;
  }

  setTestSetLoading(true);
  try {
    await electronicDocsClient.patch('/software/invoice/test-set', {
      test_set_id: config.test_set_id,
    });

    toast.success('Test Set ID guardado');
    loadConfig();
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Error al guardar');
  } finally {
    setTestSetLoading(false);
  }
};
```

#### c) Botón "Guardar Test Set"
```jsx
<Button
  onClick={handleSaveTestSet}
  disabled={!config.test_set_id || testSetLoading}
  size="sm"
  className="w-full h-8"
>
  {testSetLoading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
  Guardar Test Set
</Button>
```

**Antes:** Botón "Habilitar" que no hacía nada

**Ahora:** Botón "Guardar Test Set" que guarda el Test Set ID en la base de datos

**Resultado:**
- ✅ Los usuarios pueden guardar el Test Set ID independientemente
- ✅ El campo precarga el valor guardado anteriormente
- ✅ Feedback visual con loading spinner y toast messages
- ✅ Dos botones separados: "Guardar" (outline) y "Habilitar" (primary)
- ✅ Botón "Guardar" guarda en base de datos
- ✅ Botón "Habilitar" enviará a DIAN (pendiente implementación)

## Archivos Modificados

### Backend
- `company-service/src/modules/companies/companies.service.ts`
- `contagracia-shared-modules/shared-dian/src/dian-api.service.ts`
- `electronic-documents-service/src/modules/certificate/certificate.service.ts`
- `electronic-documents-service/src/modules/software/software.controller.ts`
- `electronic-documents-service/src/modules/software/software.service.ts`

### Frontend
- `front_contagracia/src/modules/electronic-documents/components/CertificateCard.tsx`
- `front_contagracia/src/modules/electronic-documents/components/PayrollSoftwareCard.tsx`
- `front_contagracia/src/modules/electronic-documents/components/InvoiceSoftwareCard.tsx`

## Notas de Seguridad

### Contraseña del Certificado
- La contraseña se devuelve en el endpoint solo para usuarios autenticados
- El usuario debe tener el permiso `electronic_documents.certificate.load`
- La contraseña se transmite sobre HTTPS en producción
- Se guarda encriptada en CompanySetting (si el tenant DB lo soporta)

### Validación DIAN
- Los IDs enviados son validados contra las tablas paramétricas del master DB
- El API de DIAN valida que los IDs correspondan a registros válidos en su sistema
- Errores 422 ahora incluyen detalles específicos del campo inválido

## Lecciones Aprendidas

1. **Usar IDs, no Codes**: Cuando un API externo espera IDs, enviar los IDs reales de las tablas, no códigos internos
2. **Logs de Debugging**: Agregar logs del payload antes de enviar a APIs externas facilita debugging
3. **Clients Configurados**: Usar clients de axios configurados en lugar de `fetch()` directo
4. **UX de Fechas**: Las cuentas regresivas ("Vence en X días") son más útiles que fechas absolutas
5. **Errores Descriptivos**: Capturar y mostrar mensajes de error del backend, no solo códigos HTTP

## Referencias

- [Configuración API Client](../front_contagracia/src/config/api.config.ts)
- [Documentación DIAN API](./electronic-documents-service/docs/dian-integration.md)
