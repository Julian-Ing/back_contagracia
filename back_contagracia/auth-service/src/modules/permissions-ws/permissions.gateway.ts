import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PermissionsWsService } from './permissions-ws.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  companyId?: string;
  roleKey?: string;
  userType?: 'system_admin' | 'company_user';
  tabId?: string;
}

@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class PermissionsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PermissionsGateway.name);

  /**
   * Tracking de tabIds conocidos por usuario.
   * Grace period: al desconectar, el tabId permanece 10s para distinguir
   * reconexiones (token refresh) de pestañas genuinamente nuevas.
   */
  private knownTabs = new Map<string, Set<string>>(); // userId → Set<tabId>

  constructor(
    private readonly jwtService: JwtService,
    private readonly permissionsWsService: PermissionsWsService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} sin token, desconectando...`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);

      client.userId = payload.sub;
      client.userType = payload.user_type;
      client.companyId = payload.company_id;
      client.roleKey = payload.role;
      client.tabId = client.handshake.auth?.tabId;

      // Room personal
      client.join(`user:${client.userId}`);

      // Para system_admin: room de admins
      if (payload.user_type === 'system_admin') {
        client.join('system_admins');
      } else {
        // Para company_user: rooms de compañía y rol
        if (client.companyId) {
          client.join(`company:${client.companyId}`);
        }
        if (client.companyId && client.roleKey) {
          client.join(`role:${client.companyId}:${client.roleKey}`);
        }
      }

      this.permissionsWsService.addClient(client);

      // --- Session displacement: detectar pestaña/navegador nuevo ---
      if (client.tabId && client.userId) {
        if (!this.knownTabs.has(client.userId)) {
          this.knownTabs.set(client.userId, new Set());
        }
        const userTabs = this.knownTabs.get(client.userId)!;
        const isNewTab = !userTabs.has(client.tabId);
        userTabs.add(client.tabId);

        if (isNewTab) {
          // Emitir a TODOS los otros sockets de este usuario (excluye al que acaba de conectar)
          client.to(`user:${client.userId}`).emit('session:displaced', {
            activeSessionId: payload.session_id || 'unknown',
            reason: 'Se abrió una nueva pestaña/navegador',
            deviceInfo: client.handshake.headers?.['user-agent'],
            timestamp: new Date().toISOString(),
          });
          this.logger.log(`session:displaced → user:${client.userId} (nuevo tab: ${client.tabId.substring(0, 8)})`);
        }
      }

      this.logger.log(`Cliente conectado: ${client.id} (type: ${client.userType}, user: ${client.userId}, tab: ${client.tabId?.substring(0, 8)})`);
    } catch (error) {
      this.logger.warn(`Token inválido para cliente ${client.id}: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.permissionsWsService.removeClient(client.id);

    // Grace period: mantener tabId conocido por 10s para no confundir
    // reconexiones (token refresh) con pestañas nuevas
    if (client.userId && client.tabId) {
      const tabId = client.tabId;
      const userId = client.userId;
      setTimeout(() => {
        // Solo borrar si no hay otro socket activo con el mismo tabId
        const remaining = this.permissionsWsService.getClientsByUserId(userId);
        const stillActive = remaining.some((c: any) => c.tabId === tabId);
        if (!stillActive) {
          const userTabs = this.knownTabs.get(userId);
          if (userTabs) {
            userTabs.delete(tabId);
            if (userTabs.size === 0) this.knownTabs.delete(userId);
          }
        }
      }, 10000);
    }

    this.logger.log(`Cliente desconectado: ${client.id}`);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): string {
    return 'pong';
  }

  // =============================================
  // EVENTOS DE PERMISOS
  // =============================================

  /**
   * Notificar a usuarios con un rol que sus permisos cambiaron
   */
  emitRoleUpdated(companyId: string, roleKey: string) {
    const room = `role:${companyId}:${roleKey}`;
    this.server.to(room).emit('permissions:refresh', {
      reason: 'role_updated',
      roleKey,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`permissions:refresh emitido a room: ${room}`);
  }

  /**
   * Notificar a un usuario que su rol cambió
   */
  emitUserRoleChanged(userId: string, newRoleKey: string) {
    this.server.to(`user:${userId}`).emit('permissions:refresh', {
      reason: 'user_role_changed',
      newRoleKey,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`permissions:refresh emitido a usuario: ${userId}`);
  }

  /**
   * Mover usuario a nuevo room de rol
   */
  async moveUserToNewRole(userId: string, companyId: string, oldRoleKey: string, newRoleKey: string) {
    const clients = this.permissionsWsService.getClientsByUserId(userId);
    for (const client of clients) {
      if (oldRoleKey) {
        client.leave(`role:${companyId}:${oldRoleKey}`);
      }
      client.join(`role:${companyId}:${newRoleKey}`);
      (client as AuthenticatedSocket).roleKey = newRoleKey;
    }
  }

  // =============================================
  // EVENTOS DE SESIÓN (FORZAR LOGOUT)
  // =============================================

  /**
   * Forzar logout a un usuario específico
   */
  emitForceLogout(userId: string, reason: string) {
    this.server.to(`user:${userId}`).emit('session:force_logout', {
      reason,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`session:force_logout emitido a usuario: ${userId} (${reason})`);
  }

  /**
   * Notificar a un usuario que su sesión fue desplazada por otro login.
   * Cada cliente compara activeSessionId con su propio sessionId.
   */
  emitSessionDisplaced(userId: string, activeSessionId: string, reason: string, deviceInfo?: string) {
    this.server.to(`user:${userId}`).emit('session:displaced', {
      activeSessionId,
      reason,
      deviceInfo,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`session:displaced emitido a usuario: ${userId} (activo: ${activeSessionId})`);
  }

  /**
   * Forzar logout a todos los usuarios de una compañía
   */
  emitCompanyForceLogout(companyId: string, reason: string) {
    this.server.to(`company:${companyId}`).emit('session:force_logout', {
      reason,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`session:force_logout emitido a compañía: ${companyId} (${reason})`);
  }

  // =============================================
  // EVENTOS PARA VISTAS EN TIEMPO REAL
  // =============================================

  /**
   * Notificar cambios en la lista de roles (crear/editar/eliminar)
   */
  emitRoleListChanged(companyId: string, action: 'created' | 'updated' | 'deleted' | 'status_changed', roleId: string) {
    this.server.to(`company:${companyId}`).emit('roles:changed', {
      action,
      roleId,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`roles:changed emitido a compañía: ${companyId} (${action})`);
  }

  /**
   * Notificar cambios en la lista de usuarios (crear/editar/eliminar/estado)
   */
  emitUserListChanged(companyId: string, action: 'created' | 'updated' | 'deleted' | 'status_changed', userId: string) {
    this.server.to(`company:${companyId}`).emit('users:changed', {
      action,
      userId,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`users:changed emitido a compañía: ${companyId} (${action})`);
  }

  /**
   * Notificar cambios en compañías (para system_admins)
   */
  emitCompanyListChanged(action: 'created' | 'updated' | 'deleted' | 'status_changed', companyId: string) {
    this.server.to('system_admins').emit('companies:changed', {
      action,
      companyId,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`companies:changed emitido a system_admins (${action})`);
  }

  /**
   * Notificar cambios en usuarios master/system_admin (para system_admins)
   */
  emitMasterUserListChanged(action: 'created' | 'updated' | 'deleted' | 'status_changed', userId: string) {
    this.server.to('system_admins').emit('master_users:changed', {
      action,
      userId,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`master_users:changed emitido a system_admins (${action})`);
  }

  // =============================================
  // EVENTOS DE NOTIFICACIONES
  // =============================================

  /**
   * Nueva notificación creada para una compañía
   */
  emitNotificationCreated(companyId: string, notification: { id: string; type: string; title: string; message: string; action_url?: string | null }) {
    this.server.to(`company:${companyId}`).emit('notifications:received', {
      notification,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`notifications:received emitido a compañía: ${companyId}`);
  }

  /**
   * Notificación marcada como leída
   */
  emitNotificationRead(companyId: string, notificationId: string) {
    this.server.to(`company:${companyId}`).emit('notifications:read', {
      notificationId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Todas las notificaciones marcadas como leídas
   */
  emitNotificationsAllRead(companyId: string) {
    this.server.to(`company:${companyId}`).emit('notifications:all_read', {
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Configuración de empresa actualizada (ej: display_decimals)
   */
  emitCompanySettingsUpdated(companyId: string, display_decimals: number) {
    this.server.to(`company:${companyId}`).emit('company:settings_updated', {
      display_decimals,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`company:settings_updated emitido a compañía ${companyId}`);
  }
}
