import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TenantContextService, DianApiService } from '@contagracia/shared-modules';
import { fileToBase64 } from './helpers/file-to-base64';
import * as path from 'path';
import FormData = require('form-data');

@Injectable()
export class CertificateService {
  private readonly logger = new Logger(CertificateService.name);
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB
  private readonly allowedExtensions = ['.p12', '.pfx'];
  private readonly mediaServiceUrl: string;

  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly dianApiService: DianApiService,
    private readonly configService: ConfigService,
  ) {
    this.mediaServiceUrl = this.configService.get<string>(
      'MEDIA_SERVICE_URL',
      'http://localhost:3018/api',
    );
  }

  /**
   * Subir certificado .p12:
   * 1. Valida archivo y password
   * 2. Envía a API DIAN (base64)
   * 3. Si DIAN OK → sube a media-service (category: certificate, visibility: private)
   * 4. Guarda media URL y password en tenant CompanySetting
   */
  async uploadCertificate(
    companyId: string,
    file: Express.Multer.File,
    password: string,
    authHeader?: string,
  ): Promise<{ success: boolean; message: string; expires_at?: string }> {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!this.allowedExtensions.includes(ext)) {
      throw new BadRequestException(`Tipo de archivo no permitido: ${ext}. Permitidos: .p12, .pfx`);
    }
    if (file.size > this.maxFileSize) {
      throw new BadRequestException('El archivo excede el tamaño máximo de 5MB');
    }
    if (!password?.trim()) {
      throw new BadRequestException('La contraseña del certificado es requerida');
    }

    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new BadRequestException('No se pudo acceder a la base de datos del tenant');
    }

    // Obtener token DIAN y NIT
    const token = await this.dianApiService.getDianToken(companyId, this.tenantContext);
    if (!token) {
      throw new BadRequestException('La empresa no tiene token DIAN. Sincronice la empresa primero.');
    }

    const nit = await this.tenantContext.getCompanyNit(companyId);
    if (!nit) {
      throw new BadRequestException('Empresa no encontrada');
    }

    // 1. Enviar a API DIAN
    const base64 = fileToBase64(file.buffer);
    const dianResult = await this.dianApiService.uploadCertificate(companyId, {
      certificate: base64,
      password: password.trim(),
      nit,
      token,
    });

    if (!dianResult.success) {
      throw new BadRequestException({
        message: dianResult.message || 'Error al cargar certificado en DIAN',
        errors: dianResult.errors,
      });
    }

    // 2. DIAN OK → subir a media-service
    let mediaUrl: string;
    try {
      mediaUrl = await this.uploadToMediaService(file, authHeader);
    } catch (err) {
      this.logger.error(`Error subiendo certificado a media-service: ${err.message}`);
      throw new BadRequestException(
        'Certificado cargado en DIAN pero falló al guardar el archivo. Intente de nuevo.',
      );
    }

    // 3. Eliminar certificado anterior de media-service (soft delete)
    const existingPath = await tenantDb.companySetting.findFirst({
      where: { category: 'dian', key: 'certificate_path' },
    });
    if (existingPath?.value && existingPath.value.startsWith('/api/media/')) {
      await this.deleteFromMediaService(existingPath.value, authHeader);
    }

    // 4. Guardar media URL y password en tenant CompanySetting
    await tenantDb.companySetting.update({
      where: { category_key: { category: 'dian', key: 'certificate_path' } },
      data: { value: mediaUrl },
    });

    await tenantDb.companySetting.update({
      where: { category_key: { category: 'dian', key: 'certificate_password' } },
      data: { value: password.trim() },
    });

    if (dianResult.expires_at) {
      await tenantDb.companySetting.update({
        where: { category_key: { category: 'dian', key: 'certificate_expires_at' } },
        data: { value: dianResult.expires_at },
      });
    }

    this.logger.log(`Certificado cargado para empresa ${nit}`);

    return {
      success: true,
      message: dianResult.message || 'Certificado cargado exitosamente',
      expires_at: dianResult.expires_at,
    };
  }

  /**
   * Obtener info del certificado
   */
  async getCertificateInfo(companyId: string): Promise<{
    has_certificate: boolean;
    file_name?: string;
    password?: string;
    expires_at?: string;
  }> {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) return { has_certificate: false };

    const settings = await tenantDb.companySetting.findMany({
      where: { category: 'dian', key: { in: ['certificate_path', 'certificate_password', 'certificate_expires_at'] } },
    });

    const certPath = settings.find(s => s.key === 'certificate_path')?.value;
    const certPassword = settings.find(s => s.key === 'certificate_password')?.value;
    const expiresAt = settings.find(s => s.key === 'certificate_expires_at')?.value;

    // Para media URLs (/api/media/{uuid}), no podemos extraer el nombre original aquí
    // El frontend puede llamar GET /media/{id}/info si necesita el nombre
    const fileName = certPath
      ? (certPath.startsWith('/api/media/') ? 'certificado.p12' : certPath.split('/').pop())
      : undefined;

    return {
      has_certificate: !!certPath,
      file_name: fileName,
      password: certPassword || undefined,
      expires_at: expiresAt || undefined,
    };
  }

  /**
   * Sube archivo a media-service con category: certificate, visibility: private
   */
  private async uploadToMediaService(
    file: Express.Multer.File,
    authHeader?: string,
  ): Promise<string> {
    const form = new FormData();
    form.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype || 'application/octet-stream',
    });
    form.append('category', 'certificate');
    form.append('visibility', 'private');

    const headers: Record<string, string> = {
      ...form.getHeaders(),
    };
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const buffer = form.getBuffer();
    headers['content-length'] = String(buffer.length);

    const res = await fetch(`${this.mediaServiceUrl}/media/upload`, {
      method: 'POST',
      headers,
      body: new Uint8Array(buffer) as any,
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`Media service responded ${res.status}: ${errorBody}`);
    }

    const data = (await res.json()) as { url: string };
    return data.url; // "/api/media/{uuid}"
  }

  /**
   * Soft-delete archivo anterior en media-service
   */
  private async deleteFromMediaService(
    mediaUrl: string,
    authHeader?: string,
  ): Promise<void> {
    try {
      // mediaUrl = "/api/media/{uuid}" → extraer UUID
      const uuid = mediaUrl.replace('/api/media/', '');
      const headers: Record<string, string> = {};
      if (authHeader) {
        headers['Authorization'] = authHeader;
      }

      await fetch(`${this.mediaServiceUrl}/media/${uuid}`, {
        method: 'DELETE',
        headers,
      });
    } catch (err) {
      this.logger.warn(`No se pudo eliminar certificado anterior de media-service: ${err.message}`);
    }
  }
}
