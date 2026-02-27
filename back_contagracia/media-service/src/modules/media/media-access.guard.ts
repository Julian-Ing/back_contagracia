import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '@contagracia/shared-modules';
import { getCategoryConfig } from './category-config';

/**
 * Guard que verifica el acceso a un archivo específico.
 * Se aplica en endpoints GET /media/:id y GET /media/:id/info
 *
 * Busca el archivo en tenant DB primero (si hay company_id), luego en master.
 *
 * Lógica:
 * 1. Si visibility='public' → permite sin auth
 * 2. Si visibility='company' → verifica que el usuario pertenece a la empresa (tenant match)
 * 3. Si visibility='private' → verifica que user.sub === media.uploaded_by
 * 4. Si la categoría tiene viewPermission → verifica permiso en tenant
 */
@Injectable()
export class MediaAccessGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const mediaId = request.params.id;

    if (!mediaId) return false;

    const user = request.user;
    const companyId = user?.company_id ?? null;

    // Buscar el archivo: tenant primero, luego master
    const media = await this.findMediaRecord(mediaId, companyId);

    if (!media) {
      throw new NotFoundException('Archivo no encontrado');
    }

    // Guardar media en request para no hacer doble query en el controller
    request.media = media;

    // 1. Archivos públicos: acceso libre
    if (media.visibility === 'public') {
      return true;
    }

    // Para archivos no públicos, el usuario debe estar autenticado
    if (!user) {
      throw new ForbiddenException('Autenticación requerida');
    }

    const userId = user.sub || user.user_id;
    const isAdmin =
      user.role === 'owner' ||
      user.role === 'admin' ||
      user.user_type === 'system_admin';

    // Admin/owner del sistema tiene acceso total
    if (isAdmin) {
      return true;
    }

    // 2. Archivos de empresa: solo existen en tenant DB
    if (media.visibility === 'company') {
      if (media._source !== 'tenant' || !companyId) {
        throw new ForbiddenException('No tienes acceso a archivos de esta empresa');
      }
    }

    // 3. Archivos privados: solo el dueño
    if (media.visibility === 'private') {
      if (userId !== media.uploaded_by) {
        throw new ForbiddenException('Solo el dueño del archivo puede acceder');
      }
    }

    // 4. Verificar permiso de la categoría si existe
    const categoryConfig = getCategoryConfig(media.category);
    if (categoryConfig?.viewPermission && companyId) {
      await this.checkViewPermission(user, categoryConfig.viewPermission);
    }

    return true;
  }

  /**
   * Busca media en tenant DB primero (si hay companyId), luego en master DB.
   */
  private async findMediaRecord(
    mediaId: string,
    companyId: string | null,
  ): Promise<any> {
    // Intentar en tenant primero
    if (companyId) {
      const tenantClient = await this.tenantContext.getTenantClient(companyId);
      if (tenantClient) {
        const tenantMedia = await tenantClient.media.findUnique({
          where: { id: mediaId },
        });
        if (tenantMedia && tenantMedia.is_active) {
          return { ...tenantMedia, _source: 'tenant', _companyId: companyId };
        }
      }
    }

    // Fallback a master DB
    const masterMedia = await this.prisma.media.findUnique({
      where: { id: mediaId },
    });

    if (!masterMedia || !masterMedia.is_active) {
      return null;
    }

    return { ...masterMedia, _source: 'master' };
  }

  private async checkViewPermission(
    user: any,
    permission: string,
  ): Promise<void> {
    if (
      user.role === 'owner' ||
      user.role === 'admin' ||
      user.user_type === 'system_admin'
    ) {
      return;
    }

    try {
      const tenantClient = await this.tenantContext.getTenantClient(
        user.company_id,
      );
      if (!tenantClient) {
        throw new ForbiddenException('Empresa no encontrada');
      }

      const tenantUserId = user.sub || user.user_id;
      const tenantUser = await tenantClient.tenantUser.findUnique({
        where: { id: tenantUserId },
        select: { role_id: true },
      });

      if (!tenantUser) {
        throw new ForbiddenException('Usuario no encontrado');
      }

      const rolePermissions = await tenantClient.rolePermission.findMany({
        where: { role_id: tenantUser.role_id, granted: true },
        select: { action_key: true },
      });

      const userPermissions = rolePermissions.map((p) => p.action_key);

      if (!userPermissions.includes(permission)) {
        throw new ForbiddenException(
          `Permiso requerido: ${permission}`,
        );
      }
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      throw new ForbiddenException('Error verificando permisos');
    }
  }
}
