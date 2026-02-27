import { Injectable, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';
import { CreateEmailSendDto } from './dto/create-email-send.dto';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  // --- Templates ---

  async findAllTemplates(companyId: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.emailTemplate.findMany({
      where: { is_active: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async createTemplate(companyId: string, dto: CreateEmailTemplateDto): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.emailTemplate.create({
      data: {
        name: dto.name,
        subject: dto.subject,
        body_html: dto.body_html,
        variables: dto.variables ?? undefined,
      },
    });
  }

  async updateTemplate(companyId: string, id: string, dto: UpdateEmailTemplateDto): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.emailTemplate.update({
      where: { id },
      data: dto,
    });
  }

  async removeTemplate(companyId: string, id: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.emailTemplate.update({
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
  ): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const where: any = {};
    if (filters.campaign_id) where.campaign_id = filters.campaign_id;
    if (filters.third_party_id) where.third_party_id = filters.third_party_id;
    if (filters.status) where.status = filters.status;

    const [data, total] = await Promise.all([
      db.emailSend.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take,
      }),
      db.emailSend.count({ where }),
    ]);

    return { data, total, skip, take };
  }

  async createSend(companyId: string, dto: CreateEmailSendDto): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.emailSend.create({
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
