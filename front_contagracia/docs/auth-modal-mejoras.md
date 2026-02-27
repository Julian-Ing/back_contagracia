# Mejoras en AuthModal - 2026-01-29

## Resumen
Se realizaron mejoras significativas en el modal de autenticación para mejorar la experiencia de usuario en el flujo de registro e inicio de sesión.

## Cambios Realizados

### 1. Validación de NIT Duplicado (AuthModal.tsx)
Se agregó validación en tiempo real para verificar si un NIT ya está registrado antes de consultar la DIAN:

```typescript
const handleRutQuery = async () => {
  // Primero verificar si el NIT ya está registrado
  const nitCheck = await checkNitExists(nit);
  if (nitCheck.exists) {
    setNitError('Este NIT ya está registrado en el sistema');
    return;
  }
  // Si no existe, consultar en la DIAN...
};
```

**Estado agregado:**
```typescript
const [nitError, setNitError] = useState('');
```

### 2. Flujo de Registro Exitoso Mejorado (AuthModal.tsx)
**Antes:** Se mostraba un `alert()` feo y se cerraba el modal.

**Después:**
- Muestra mensaje de éxito elegante (verde con ícono)
- Cambia automáticamente al tab de "Iniciar Sesión"
- Pre-carga email y NIT en el formulario de login
- Usuario solo debe ingresar su contraseña

```typescript
// Después de registro exitoso:
setLoginEmail(registerEmail.trim());
setLoginNit(nit.trim());
setSuccessMessage('¡Registro exitoso! Ingresa tu contraseña para iniciar sesión.');
setActiveTab('login');
```

**Estados agregados:**
```typescript
const [activeTab, setActiveTab] = useState('login');
const [successMessage, setSuccessMessage] = useState('');
```

### 3. Tabs Controlados
Se cambió de `defaultValue` a `value` controlado para poder cambiar de tab programáticamente:

```tsx
<Tabs
  value={activeTab}
  onValueChange={(v) => {
    setActiveTab(v);
    setSuccessMessage('');
    setError('');
  }}
>
```

### 4. Mensaje de Éxito en Login
Se agregó visualización del mensaje de éxito en el tab de login:

```tsx
{successMessage && (
  <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 ...">
    <Check className="h-4 w-4 flex-shrink-0" />
    {successMessage}
  </div>
)}
```

## Cambios en authService.ts

### checkNitExists
Nueva función para verificar si un NIT ya está registrado:

```typescript
export const checkNitExists = async (nit: string): Promise<CheckNitResponse> => {
  try {
    const response = await companyClient.get<CheckNitResponse>(
      `/companies/check-nit/${nit}`
    );
    return response.data;
  } catch (error: any) {
    return { exists: false };
  }
};
```

**Tipo agregado:**
```typescript
export interface CheckNitResponse {
  exists: boolean;
  message?: string;
}
```

## Cambios en apiClient.ts

### Redirect en Error de Autenticación
**Antes:** Redirigía a `/auth/login` (página que no existe)

**Después:** Redirige a `/` (home, donde está el modal de auth)

```typescript
// Antes
window.location.href = '/auth/login';

// Después
window.location.href = '/';
```

## Archivos Modificados
- `src/modules/auth/components/AuthModal.tsx`
- `src/modules/auth/services/authService.ts`
- `src/modules/auth/index.ts` (export de CheckNitResponse)
- `src/shared/services/api/apiClient.ts`

## Flujo de Usuario Mejorado

### Registro:
1. Usuario ingresa email → recibe código OTP
2. Verifica código → pasa al formulario de registro
3. Ingresa NIT → sistema verifica que no esté duplicado
4. Si NIT válido → consulta DIAN y auto-completa datos
5. Completa formulario y envía
6. **Registro exitoso** → mensaje verde, cambia a login con datos pre-cargados
7. Solo ingresa contraseña → login automático

### Login después de registro:
- Email pre-cargado ✓
- NIT pre-cargado ✓
- Solo falta la contraseña
