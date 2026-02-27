import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TenantContextService } from '@contagracia/shared-modules';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';
import { CreateEmailSendDto } from './dto/create-email-send.dto';
import { CreateTemplateTypeDto } from './dto/create-template-type.dto';
import { UpdateTemplateTypeDto } from './dto/update-template-type.dto';

@Injectable()
export class EmailTemplatesService {
  private readonly logger = new Logger(EmailTemplatesService.name);

  constructor(private readonly tenantContext: TenantContextService) {}

  // --- Template Types ---

  async findAllTypes(companyId: string) {
    const db = await this.tenantContext.getTenantClient(companyId);
    return (db as any).emailTemplateType.findMany({
      where: { is_active: true },
      orderBy: { created_at: 'desc' },
      include: { _count: { select: { templates: true } } },
    });
  }

  async createType(companyId: string, dto: CreateTemplateTypeDto) {
    const db = await this.tenantContext.getTenantClient(companyId);

    if (dto.module_key) {
      const existing = await (db as any).emailTemplateType.findUnique({
        where: { module_key: dto.module_key },
      });
      if (existing && existing.is_active) {
        throw new BadRequestException(
          `Ya existe un tipo de plantilla asignado al módulo "${dto.module_key}"`,
        );
      }
      // Reactivar si estaba soft-deleted
      if (existing && !existing.is_active) {
        return (db as any).emailTemplateType.update({
          where: { id: existing.id },
          data: { name: dto.name, description: dto.description, is_active: true },
        });
      }
    }

    return (db as any).emailTemplateType.create({
      data: {
        name: dto.name,
        module_key: dto.module_key || null,
        description: dto.description || null,
      },
    });
  }

  async updateType(companyId: string, id: string, dto: UpdateTemplateTypeDto) {
    const db = await this.tenantContext.getTenantClient(companyId);

    const existing = await (db as any).emailTemplateType.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Tipo de plantilla no encontrado');

    if (dto.module_key && dto.module_key !== existing.module_key) {
      const conflict = await (db as any).emailTemplateType.findUnique({
        where: { module_key: dto.module_key },
      });
      if (conflict && conflict.id !== id && conflict.is_active) {
        throw new BadRequestException(
          `Ya existe un tipo de plantilla asignado al módulo "${dto.module_key}"`,
        );
      }
    }

    return (db as any).emailTemplateType.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.module_key !== undefined && { module_key: dto.module_key || null }),
        ...(dto.description !== undefined && { description: dto.description || null }),
      },
    });
  }

  async removeType(companyId: string, id: string) {
    const db = await this.tenantContext.getTenantClient(companyId);
    const existing = await (db as any).emailTemplateType.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Tipo de plantilla no encontrado');

    // Desasignar plantillas de este tipo
    await (db as any).emailTemplate.updateMany({
      where: { type_id: id },
      data: { type_id: null },
    });

    return (db as any).emailTemplateType.update({
      where: { id },
      data: { is_active: false },
    });
  }

  // --- Templates ---

  async findAllTemplates(companyId: string) {
    const db = await this.tenantContext.getTenantClient(companyId);
    return (db as any).emailTemplate.findMany({
      where: { is_active: true },
      orderBy: { created_at: 'desc' },
      include: { type: { select: { id: true, name: true, module_key: true } } },
    });
  }

  async findTemplatesByModule(companyId: string, moduleKey: string) {
    const db = await this.tenantContext.getTenantClient(companyId);

    const templateType = await (db as any).emailTemplateType.findUnique({
      where: { module_key: moduleKey },
    });

    if (!templateType || !templateType.is_active) return [];

    return (db as any).emailTemplate.findMany({
      where: { type_id: templateType.id, is_active: true },
      orderBy: { created_at: 'desc' },
      include: { type: { select: { id: true, name: true, module_key: true } } },
    });
  }

  async createTemplate(companyId: string, dto: CreateEmailTemplateDto) {
    const db = await this.tenantContext.getTenantClient(companyId);
    return (db as any).emailTemplate.create({
      data: {
        name: dto.name,
        subject: dto.subject,
        body_html: dto.body_html,
        variables: dto.variables ?? undefined,
        type_id: dto.type_id || null,
      },
      include: { type: { select: { id: true, name: true, module_key: true } } },
    });
  }

  async updateTemplate(companyId: string, id: string, dto: UpdateEmailTemplateDto) {
    const db = await this.tenantContext.getTenantClient(companyId);
    return (db as any).emailTemplate.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.subject !== undefined && { subject: dto.subject }),
        ...(dto.body_html !== undefined && { body_html: dto.body_html }),
        ...(dto.variables !== undefined && { variables: dto.variables }),
        ...(dto.type_id !== undefined && { type_id: dto.type_id || null }),
      },
      include: { type: { select: { id: true, name: true, module_key: true } } },
    });
  }

  async removeTemplate(companyId: string, id: string) {
    const db = await this.tenantContext.getTenantClient(companyId);
    return (db as any).emailTemplate.update({
      where: { id },
      data: { is_active: false },
    });
  }

  // --- Sends ---

  async findAllSends(
    companyId: string,
    filters: { campaign_id?: string; third_party_id?: string; status?: string },
    skip = 0,
    take = 20,
  ) {
    const db = await this.tenantContext.getTenantClient(companyId);

    const where: any = {};
    if (filters.campaign_id) where.campaign_id = filters.campaign_id;
    if (filters.third_party_id) where.third_party_id = filters.third_party_id;
    if (filters.status) where.status = filters.status;

    const [data, total] = await Promise.all([
      (db as any).emailSend.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take,
      }),
      (db as any).emailSend.count({ where }),
    ]);

    return { data, total, skip, take };
  }

  async createSend(companyId: string, dto: CreateEmailSendDto) {
    const db = await this.tenantContext.getTenantClient(companyId);
    return (db as any).emailSend.create({
      data: {
        template_id: dto.template_id,
        third_party_id: dto.third_party_id,
        campaign_id: dto.campaign_id,
        subject: dto.subject,
        body_html: dto.body_html,
        status: 'PENDING',
      },
    });
  }
}
