import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';
import { CreateDocumentCategoryDto, UpdateDocumentCategoryDto } from './dto';

const DEFAULT_CATEGORIES = [
  { name: 'Reglamento', slug: 'reglamento', color: '#3B82F6', icon: 'BookOpen', sort_order: 0 },
  { name: 'Acta', slug: 'acta', color: '#8B5CF6', icon: 'FileText', sort_order: 1 },
  { name: 'Contrato', slug: 'contrato', color: '#F59E0B', icon: 'FileSignature', sort_order: 2 },
  { name: 'Manual', slug: 'manual', color: '#10B981', icon: 'BookMarked', sort_order: 3 },
  { name: 'Certificado', slug: 'certificado', color: '#EF4444', icon: 'Award', sort_order: 4 },
  { name: 'Otro', slug: 'otro', color: '#6B7280', icon: 'File', sort_order: 5 },
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

@Injectable()
export class DocumentCategoriesService {
  private readonly logger = new Logger(DocumentCategoriesService.name);

  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async findAll(
    companyId: string,
    query: { search?: string; is_active?: boolean },
  ) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const where: any = { company_id: companyId };
    if (query.is_active !== undefined) where.is_active = query.is_active;
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const data = await db.phDocumentCategory.findMany({
      where,
      orderBy: { sort_order: 'asc' },
      include: { _count: { select: { documents: true } } },
    });

    return { data, total: data.length };
  }

  async findOne(companyId: string, id: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const cat = await db.phDocumentCategory.findUnique({
      where: { id },
      include: { _count: { select: { documents: true } } },
    });
    if (!cat || cat.company_id !== companyId) {
      throw new NotFoundException('Categoría no encontrada');
    }
    return cat;
  }

  async create(companyId: string, dto: CreateDocumentCategoryDto, userId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const slug = slugify(dto.name);

    const existing = await db.phDocumentCategory.findUnique({
      where: { company_id_slug: { company_id: companyId, slug } },
    });
    if (existing) {
      throw new ConflictException(`Ya existe una categoría con el nombre "${dto.name}"`);
    }

    return db.phDocumentCategory.create({
      data: {
        company_id: companyId,
        name: dto.name,
        slug,
        description: dto.description,
        color: dto.color,
        icon: dto.icon,
        sort_order: dto.sort_order ?? 0,
        created_by: userId,
      },
      include: { _count: { select: { documents: true } } },
    });
  }

  async update(companyId: string, id: string, dto: UpdateDocumentCategoryDto) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const existing = await db.phDocumentCategory.findUnique({ where: { id } });
    if (!existing || existing.company_id !== companyId) {
      throw new NotFoundException('Categoría no encontrada');
    }

    const data: any = { ...dto };
    if (dto.name && dto.name !== existing.name) {
      data.slug = slugify(dto.name);
      const dup = await db.phDocumentCategory.findUnique({
        where: { company_id_slug: { company_id: companyId, slug: data.slug } },
      });
      if (dup && dup.id !== id) {
        throw new ConflictException(`Ya existe una categoría con el nombre "${dto.name}"`);
      }
    }

    return db.phDocumentCategory.update({
      where: { id },
      data,
      include: { _count: { select: { documents: true } } },
    });
  }

  async remove(companyId: string, id: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const existing = await db.phDocumentCategory.findUnique({
      where: { id },
      include: { _count: { select: { documents: true } } },
    });
    if (!existing || existing.company_id !== companyId) {
      throw new NotFoundException('Categoría no encontrada');
    }

    // Soft delete: documents keep category_id until next edit (SetNull on hard delete)
    await db.phDocumentCategory.update({
      where: { id },
      data: { is_active: false },
    });

    return { message: 'Categoría desactivada exitosamente' };
  }

  async seedDefaults(companyId: string, userId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const existing = await db.phDocumentCategory.count({
      where: { company_id: companyId },
    });
    if (existing > 0) {
      return { message: 'Las categorías ya existen', seeded: false };
    }

    await db.phDocumentCategory.createMany({
      data: DEFAULT_CATEGORIES.map((cat) => ({
        company_id: companyId,
        ...cat,
        created_by: userId,
      })),
    });

    const data = await db.phDocumentCategory.findMany({
      where: { company_id: companyId },
      orderBy: { sort_order: 'asc' },
      include: { _count: { select: { documents: true } } },
    });

    return { message: 'Categorías creadas exitosamente', seeded: true, data };
  }
}
