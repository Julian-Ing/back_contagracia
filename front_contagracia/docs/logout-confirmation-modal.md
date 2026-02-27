# Modal de Confirmación al Cerrar Sesión

## Descripción

Se agregó un modal de confirmación antes de cerrar sesión en ambas vistas (admin y dashboard) para evitar cierres accidentales.

## Componentes Modificados

### AdminSidebar (`shared/components/layout/AdminSidebar.tsx`)
- El botón "Cerrar Sesión" ahora abre un `Dialog` de confirmación
- El usuario debe confirmar con el botón "Cerrar Sesión" (rojo) o cancelar

### Header (`shared/components/layout/Header.tsx`)
- El botón "Cerrar Sesión" del dropdown del usuario ahora abre un `Dialog` de confirmación
- El dropdown se cierra al abrir el modal para evitar superposición

## Comportamiento

1. Usuario hace click en "Cerrar Sesión"
2. Se muestra modal: "¿Estás seguro de que deseas cerrar tu sesión?"
3. Opciones:
   - **Cancelar**: cierra el modal, no hace nada
   - **Cerrar Sesión** (rojo): ejecuta logout y redirige a `/`
