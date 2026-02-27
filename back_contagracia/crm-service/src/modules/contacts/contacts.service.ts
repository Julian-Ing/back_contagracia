import { Injectable, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async findAll(
    companyId: string,
    filters: {
      search?: string;
      segment?: string;
      tagId?: string;
      skip?: number;
      take?: number;
    },
  ) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const { search, segment, tagId, skip = 0, take = 20 } = filters;

    const where: any = {
      is_active: true,
      roles: { has: 'CONTACT' },
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { company_name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (segment) {
      where.segment = segment;
    }

    if (tagId) {
      where.crm_tag_assignments = {
        some: { tag_id: tagId },
      };
    }

    const [data, total] = await Promise.all([
      db.thirdParty.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
      }),
      db.thirdParty.count({ where }),
    ]);

    return { data, total };
  }

  async findOne(companyId: string, id: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.thirdParty.findUniqueOrThrow({
      where: { id },
      include: {
        crm_leads: { where: { is_active: true } },
        crm_opportunities: { include: { stage: true } },
        crm_activities: { take: 5, orderBy: { created_at: 'desc' } },
        crm_tag_assignments: { include: { tag: true } },
      },
    });
  }

  async create(companyId: string, dto: CreateContactDto, userId: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.thirdParty.create({
      data: {
        name: dto.full_name,
        email: dto.email,
        phone: dto.phone,
        company_name: dto.company_name,
        whatsapp_number: dto.whatsapp_number,
        notes: dto.notes,
        birth_date: dto.birth_date ? new Date(dto.birth_date) : undefined,
        roles: ['CONTACT'],
      },
    });
  }

  async update(companyId: string, id: string, dto: UpdateContactDto, userId: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const updateData: any = {
      updated_by: userId,
    };

    if (dto.full_name !== undefined) updateData.name = dto.full_name;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.company_name !== undefined) updateData.company_name = dto.company_name;
    if (dto.whatsapp_number !== undefined) updateData.whatsapp_number = dto.whatsapp_number;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.birth_date !== undefined) updateData.birth_date = new Date(dto.birth_date);

    return db.thirdParty.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(companyId: string, id: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.thirdParty.update({
      where: { id },
      data: {
        is_active: false,
        deleted_at: new Date(),
      },
    });
  }

  async assignTags(companyId: string, contactId: string, tagIds: string[]): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const data = tagIds.map((tagId) => ({
      third_party_id: contactId,
      tag_id: tagId,
    }));

    await db.crmContactTagAssignment.createMany({
      data,
      skipDuplicates: true,
    });

    return { message: 'Tags asignados correctamente' };
  }

  async removeTag(companyId: string, contactId: string, tagId: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    await db.crmContactTagAssignment.deleteMany({
      where: {
        third_party_id: contactId,
        tag_id: tagId,
      },
    });

    return { message: 'Tag removido correctamente' };
  }
}
