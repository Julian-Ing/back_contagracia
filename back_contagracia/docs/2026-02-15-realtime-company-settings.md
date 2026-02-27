# Realtime: display_decimals en tiempo real

## Contexto

Cuando un usuario cambia `display_decimals` en perfil de empresa, los demas usuarios de la misma empresa no veian el cambio hasta refrescar la pagina. Ahora se propaga en tiempo real via Redis pub/sub + WebSocket.

## Flujo

```
Company Profile UI -> updateCompany({ display_decimals })
  -> company-service guarda en DB
  -> RealtimePublisherService.notifyCompanySettingsUpdated()
  -> Redis channel 'realtime:company_settings'
  -> auth-service RealtimeSubscriberService recibe
  -> PermissionsGateway emite 'company:settings_updated' a room company:{id}
  -> Frontend RealtimeProvider notifica subscribers
  -> CompanySettingsProvider actualiza displayDecimals sin refetch
```

## Cambios backend

### shared-realtime/src/realtime.events.ts

- Nuevo canal: `RealtimeChannels.COMPANY_SETTINGS = 'realtime:company_settings'`
- Nuevo tipo: `CompanySettingsEventTypes.SETTINGS_UPDATED = 'company_settings_updated'`
- Nuevo payload: `CompanySettingsUpdatedPayload { companyId, display_decimals }`

### shared-realtime/src/realtime-publisher.service.ts

- Nuevo metodo: `notifyCompanySettingsUpdated(companyId, display_decimals)` publica al canal COMPANY_SETTINGS

### company-service/src/app.module.ts

- Importa `RealtimeModule` para tener acceso a `RealtimePublisherService`

### company-service/src/modules/companies/companies.service.ts

- Inyecta `RealtimePublisherService`
- En `updateCompany()`, si `data.display_decimals !== undefined`, publica evento realtime

### auth-service/src/modules/permissions-ws/realtime-subscriber.service.ts

- Subscribe al canal `RealtimeChannels.COMPANY_SETTINGS`
- Handler `handleCompanySettingsEvent()` llama `gateway.emitCompanySettingsUpdated()`

### auth-service/src/modules/permissions-ws/permissions.gateway.ts

- Nuevo metodo `emitCompanySettingsUpdated(companyId, display_decimals)` emite `'company:settings_updated'` al room `company:{companyId}`

## Archivos backend

| Archivo | Cambio |
|---------|--------|
| `shared-realtime/src/realtime.events.ts` | Nuevo canal, evento y payload |
| `shared-realtime/src/realtime-publisher.service.ts` | Nuevo metodo publish |
| `company-service/src/app.module.ts` | Importar RealtimeModule |
| `company-service/src/modules/companies/companies.service.ts` | Inyectar publisher, publicar en update |
| `auth-service/.../realtime-subscriber.service.ts` | Subscribe + handler |
| `auth-service/.../permissions.gateway.ts` | Nuevo emit method |
