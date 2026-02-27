import { Injectable, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Injectable()
export class TagsService {
  private readonly logger = new Logger(TagsService.name);

  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async findAll(companyId: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.crmContactTag.findMany({
      where: { is_active: true },
    });
  }

  async create(companyId: string, dto: CreateTagDto): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.crmContactTag.create({
      data: {
        name: dto.name,
        color: dto.color ?? '#3B82F6',
      },
    });
  }

  async update(companyId: string, id: string, dto: UpdateTagDto): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.crmContactTag.update({
      where: { id },
      data: dto,
    });
  }

  async remove(companyId: string, id: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.crmContactTag.update({
      where: { id },
      data: { is_active: false },
    });
  }
}
