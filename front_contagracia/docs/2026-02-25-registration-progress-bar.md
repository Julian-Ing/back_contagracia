# Feat: Barra de progreso en registro de empresa + quitar timeout

**Fecha:** 2026-02-25

## Cambios

### Barra de progreso en registro
El registro de empresa toma ~40 segundos (crear DB, migraciones, seeds, usuario). Se agregó una barra de progreso simulada por pasos que informa al usuario en qué etapa va:
- Creando empresa... (5%)
- Creando base de datos... (15%)
- Ejecutando migraciones... (30%)
- Configurando catálogos... (45-85%)
- Creando usuario administrador... (92%)
- Finalizando... (96%)
- ¡Registro completado! (100%)

Reemplaza el botón "Crear Cuenta" por la barra mientras está en proceso.

### Quitar timeout de axios
Se eliminó el `timeout: 30000` del apiClient para que peticiones largas (como el registro) no se corten.

## Archivos modificados

- `src/modules/auth/components/AuthModal.tsx` — estado `registrationProgress`, efecto con timers, UI de barra de progreso
- `src/shared/services/api/apiClient.ts` — eliminar timeout
