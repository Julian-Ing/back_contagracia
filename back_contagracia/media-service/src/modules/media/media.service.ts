import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '@contagracia/shared-modules';
import {
  getCategoryConfig,
} from './category-config';
import { UploadMediaDto } from './dto/upload-media.dto';
import { QueryMediaDto } from './dto/query-media.dto';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class MediaService {
  private readonly baseUploadDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {
    this.baseUploadDir = path.resolve(process.cwd(), '..', 'uploads', 'media');
    this.ensureDir(this.baseUploadDir);
  }

  /**
   * Determina si el archivo va a tenant DB o master DB.
   * - company_user → tenant DB
   * - system_admin (sin company_id) → master DB
   */
  private async getDbForUser(user: any): Promise<{ db: any; isTenant: boolean }> {
    if (user?.company_id) {
      const tenantClient = await this.tenantContext.getTenantClient(user.company_id);
      if (tenantClient) {
        return { db: tenantClient, isTenant: true };
      }
    }
    return { db: this.prisma, isTenant: false };
  }

  /**
   * Busca un media por ID. Si hay company_id, busca primero en tenant, luego en master.
   */
  async findActiveMedia(mediaId: string, companyId?: string | null): Promise<any> {
    // Si hay company_id, intentar en tenant primero
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
      throw new NotFoundException('Archivo no encontrado');
    }

    return { ...masterMedia, _source: 'master' };
  }

  async upload(
    file: Express.Multer.File,
    dto: UploadMediaDto,
    user: any,
  ): Promise<any> {
    const config = getCategoryConfig(dto.category);
    if (!config) {
      throw new BadRequestException(`Categoría inválida: ${dto.category}`);
    }

    // Validar permiso de upload si la categoría lo requiere
    if (config.uploadPermission && user.company_id) {
      await this.checkPermission(user, config.uploadPermission);
    }

    // Validar MIME type
    if (!config.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de archivo no permitido: ${file.mimetype}. Permitidos: ${config.allowedMimeTypes.join(', ')}`,
      );
    }

    // Validar tamaño
    if (file.size > config.maxSize) {
      const maxMB = (config.maxSize / (1024 * 1024)).toFixed(0);
      throw new BadRequestException(
        `El archivo excede el tamaño máximo de ${maxMB}MB`,
      );
    }

    // Determinar visibilidad
    const visibility = dto.visibility ?? config.defaultVisibility;

    // Determinar DB destino
    const { db, isTenant } = await this.getDbForUser(user);
    const companyId = user.company_id ?? null;

    // Generar nombre único UUID
    const ext = path.extname(file.originalname).toLowerCase();
    const fileName = `${randomUUID()}${ext}`;

    // Crear directorio: {category}/{company_id || 'global'}
    const subDir = companyId ?? 'global';
    const categoryDir = path.join(
      this.baseUploadDir,
      dto.category,
      subDir,
    );
    this.ensureDir(categoryDir);

    // Guardar archivo en disco
    const filePath = path.join(categoryDir, fileName);
    fs.writeFileSync(filePath, file.buffer);

    // Ruta relativa para DB
    const storagePath = path.posix.join(
      dto.category,
      subDir,
      fileName,
    );

    // Datos base para el registro
    const mediaData: any = {
      original_name: file.originalname,
      file_name: fileName,
      mime_type: file.mimetype,
      size: file.size,
      category: dto.category,
      visibility,
      uploaded_by: user.sub || user.user_id,
      storage_path: storagePath,
    };

    // Registrar en DB
    const media = await db.media.create({ data: mediaData });

    return {
      id: media.id,
      original_name: media.original_name,
      mime_type: media.mime_type,
      size: media.size,
      category: media.category,
      visibility: media.visibility,
      url: `/api/media/${media.id}`,
      created_at: media.created_at,
    };
  }

  async getFileStream(
    mediaId: string,
    companyId?: string | null,
  ): Promise<{ buffer: Buffer; mimeType: string; originalName: string }> {
    const media = await this.findActiveMedia(mediaId, companyId);

    const filePath = path.join(this.baseUploadDir, media.storage_path);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Archivo no encontrado en disco');
    }

    const buffer = fs.readFileSync(filePath);
    return {
      buffer,
      mimeType: media.mime_type,
      originalName: media.original_name,
    };
  }

  async getInfo(mediaId: string, companyId?: string | null): Promise<any> {
    const media = await this.findActiveMedia(mediaId, companyId);

    return {
      id: media.id,
      original_name: media.original_name,
      mime_type: media.mime_type,
      size: media.size,
      category: media.category,
      visibility: media.visibility,
      uploaded_by: media.uploaded_by,
      url: `/api/media/${media.id}`,
      created_at: media.created_at,
      updated_at: media.updated_at,
    };
  }

  async list(query: QueryMediaDto, user: any): Promise<any> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { is_active: true };
    if (query.category) where.category = query.category;
    if (query.visibility) where.visibility = query.visibility;

    // Determinar DB
    const { db } = await this.getDbForUser(user);

    const [data, total] = await Promise.all([
      db.media.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          original_name: true,
          mime_type: true,
          size: true,
          category: true,
          visibility: true,
          uploaded_by: true,
          created_at: true,
        },
      }),
      db.media.count({ where }),
    ]);

    return {
      data: data.map((m: any) => ({
        ...m,
        url: `/api/media/${m.id}`,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async softDelete(mediaId: string, user: any): Promise<{ message: string }> {
    const companyId = user.company_id ?? null;
    const media = await this.findActiveMedia(mediaId, companyId);
    const userId = user.sub || user.user_id;

    // Solo el dueño o un admin/owner puede eliminar
    const isOwner = media.uploaded_by === userId;
    const isAdmin =
      user.role === 'owner' ||
      user.role === 'admin' ||
      user.user_type === 'system_admin';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        'Solo el dueño del archivo o un administrador puede eliminarlo',
      );
    }

    // Eliminar el registro de la BD (hard delete)
    if (media._source === 'tenant' && media._companyId) {
      const tenantClient = await this.tenantContext.getTenantClient(media._companyId);
      if (tenantClient) {
        await tenantClient.media.delete({ where: { id: mediaId } });
      }
    } else {
      await this.prisma.media.delete({ where: { id: mediaId } });
    }

    // Eliminar el archivo físico del disco
    if (media.storage_path) {
      const filePath = path.join(this.baseUploadDir, media.storage_path);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch {
        // Silencioso: el archivo físico no debe bloquear si ya fue borrado de BD
      }
    }

    return { message: 'Archivo eliminado exitosamente' };
  }

  private async checkPermission(
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
        throw new ForbiddenException('Usuario no encontrado en tenant');
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

  private ensureDir(dir: string) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
