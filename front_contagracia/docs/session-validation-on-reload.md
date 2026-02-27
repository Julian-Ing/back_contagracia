# Validación de Sesión al Recargar Página

## Descripción

Se implementó validación de la sesión contra el backend cuando el usuario recarga la página o abre una nueva pestaña. Si el usuario o la empresa ya no existen en la base de datos, la sesión se cierra automáticamente.

## Archivo Modificado

### authStore (`modules/auth/stores/authStore.ts`)

## Comportamiento

1. **Login** → `setAuthData` guarda flag `auth-validated` en `sessionStorage` → navegación al dashboard sin validación extra
2. **Recarga (F5)** → `sessionStorage` persiste en la misma pestaña → no revalida
3. **Nueva pestaña / reapertura del navegador** → `sessionStorage` vacío → se hace `POST /auth/refresh` con el refresh token → si falla, logout automático
4. **Logout** → se limpia el flag de `sessionStorage`

## Problema Resuelto

Después de ejecutar el script de limpieza de companies/tenants, al recargar la página el usuario permanecía con sesión activa porque el estado se mantenía en `localStorage` sin verificar contra el backend.
