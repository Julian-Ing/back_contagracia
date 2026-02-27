import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';
import { CreateDocumentDto, UpdateDocumentDto } from './dto';

const DOCUMENT_INCLUDE = {
  condominium: { select: { id: true, name: true } },
  category: { select: { id: true, name: true, slug: true, color: true, icon: true } },
};

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly tenantPrisma: TenantPrismaService,
  ) {}

  async findAll(
    companyId: string,
    query: {
      condominium_id?: string;
      category_id?: string;
      status?: string;
      skip?: number;
      take?: number;
    },
  ) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const where: any = {};
    if (query.condominium_id) where.condominium_id = query.condominium_id;
    if (query.category_id) where.category_id = query.category_id;
    if (query.status) where.status = query.status;

    const skip = query.skip ?? 0;
    const take = query.take ?? 50;

    const [data, total] = await Promise.all([
      db.phDocument.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
        include: DOCUMENT_INCLUDE,
      }),
      db.phDocument.count({ where }),
    ]);

    return { data, total, skip, take };
  }

  async findByCondominium(companyId: string, condominiumId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const data = await db.phDocument.findMany({
      where: { condominium_id: condominiumId },
      orderBy: { created_at: 'desc' },
      include: DOCUMENT_INCLUDE,
    });
    return { data, total: data.length };
  }

  async findOne(companyId: string, id: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const doc = await db.phDocument.findUnique({
      where: { id },
      include: DOCUMENT_INCLUDE,
    });
    if (!doc) throw new NotFoundException('Documento no encontrado');
    return doc;
  }

  async create(companyId: string, dto: CreateDocumentDto, userId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.phDocument.create({
      data: {
        condominium_id: dto.condominium_id,
        name: dto.name,
        description: dto.description,
        category_id: dto.category_id,
        file_url: dto.file_url,
        file_name: dto.file_name,
        file_size: dto.file_size,
        mime_type: dto.mime_type,
        external_url: dto.external_url,
        notes: dto.notes,
        created_by: userId,
        uploaded_by: userId,
      },
      include: DOCUMENT_INCLUDE,
    });
  }

  async update(companyId: string, id: string, dto: UpdateDocumentDto) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const existing = await db.phDocument.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Documento no encontrado');
    return db.phDocument.update({
      where: { id },
      data: { ...dto },
      include: DOCUMENT_INCLUDE,
    });
  }

  async remove(companyId: string, id: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const existing = await db.phDocument.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Documento no encontrado');

    await db.phDocument.delete({ where: { id } });
    return { message: 'Documento eliminado exitosamente' };
  }
}
