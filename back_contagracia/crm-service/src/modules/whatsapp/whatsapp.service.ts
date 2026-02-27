import { Injectable, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';
import { CreateWhatsappTemplateDto } from './dto/create-whatsapp-template.dto';
import { UpdateWhatsappTemplateDto } from './dto/update-whatsapp-template.dto';
import { CreateWhatsappMessageDto } from './dto/create-whatsapp-message.dto';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  // --- Templates ---

  async findAllTemplates(companyId: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.crmWhatsappTemplate.findMany({
      where: { is_active: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async createTemplate(companyId: string, dto: CreateWhatsappTemplateDto): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.crmWhatsappTemplate.create({
      data: {
        name: dto.name,
        template_sid: dto.template_sid,
        language: dto.language,
        body_template: dto.body_template,
        variables: dto.variables ?? undefined,
        status: dto.status ?? 'PENDING',
      },
    });
  }

  async updateTemplate(companyId: string, id: string, dto: UpdateWhatsappTemplateDto): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.crmWhatsappTemplate.update({
      where: { id },
      data: dto,
    });
  }

  // --- Conversations ---

  async findAllConversations(companyId: string, skip = 0, take = 20, status?: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const where: any = { is_active: true };
    if (status) {
      where.status = status;
    }
    const [data, total] = await Promise.all([
      db.crmWhatsappConversation.findMany({
        where,
        include: {
          third_party: true,
          messages: {
            orderBy: { created_at: 'desc' },
            take: 1,
          },
          assigned_user: { select: { id: true, full_name: true } },
        },
        orderBy: { last_message_at: 'desc' },
        skip,
        take,
      }),
      db.crmWhatsappConversation.count({ where }),
    ]);
    return { data, total, skip, take };
  }

  async updateConversation(companyId: string, id: string, data: any): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.crmWhatsappConversation.update({
      where: { id },
      data,
    });
  }

  async findConversationMessages(companyId: string, conversationId: string, skip = 0, take = 50): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const [data, total] = await Promise.all([
      db.crmWhatsappMessage.findMany({
        where: { conversation_id: conversationId },
        orderBy: { created_at: 'desc' },
        skip,
        take,
      }),
      db.crmWhatsappMessage.count({ where: { conversation_id: conversationId } }),
    ]);
    return { data, total, skip, take };
  }

  // --- Messages ---

  async createMessage(companyId: string, dto: CreateWhatsappMessageDto): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.crmWhatsappMessage.create({
      data: {
        conversation_id: dto.conversation_id,
        third_party_id: dto.third_party_id,
        lead_id: dto.lead_id,
        opportunity_id: dto.opportunity_id,
        campaign_id: dto.campaign_id,
        direction: dto.direction as any,
        phone_number: dto.phone_number,
        message_type: dto.message_type,
        message_content: dto.message_content,
        template_name: dto.template_name,
        template_params: dto.template_params ?? undefined,
        user_id: dto.user_id,
        media_url: dto.media_url,
        status: 'PENDING',
      },
    });
  }
}
