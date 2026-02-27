# Renombramiento: tercero → third_party

## Descripcion

Se renombro el campo `tercero` a `third_party` en el modulo de tenant-users para consistencia con el schema.

## Archivos Afectados

- `tenant-users/dto/create-tenant-user.dto.ts`
- `tenant-users/tenant-users.service.ts`

## Cambios

| Antes | Despues |
|-------|---------|
| `tercero_id` | `third_party_id` |
| `dto.tercero_id` | `dto.third_party_id` |
| `user.tercero` | `user.third_party` |

## Motivo

El schema Prisma usa `third_party` como nombre de la relacion, por lo que el codigo debe coincidir.
