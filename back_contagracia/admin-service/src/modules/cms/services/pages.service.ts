import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePageDto, UpdatePageDto } from '../dto';

@Injectable()
export class PagesService {
  constructor(private prisma: PrismaService) {}

  async findAll(includeInactive = false) {
    return this.prisma.page.findMany({
      where: includeInactive ? undefined : { is_active: true },
      include: {
        _count: {
          select: { sections: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    const page = await this.prisma.page.findUnique({
      where: { id },
      include: {
        sections: {
          orderBy: { display_order: 'asc' },
        },
      },
    });

    if (!page) {
      throw new NotFoundException(`Página con ID ${id} no encontrada`);
    }

    return page;
  }

  async create(createDto: CreatePageDto) {
    const existing = await this.prisma.page.findUnique({
      where: { slug: createDto.slug },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe una página con el slug "${createDto.slug}"`,
      );
    }

    return this.prisma.page.create({
      data: createDto,
      include: {
        _count: {
          select: { sections: true },
        },
      },
    });
  }

  async update(id: string, updateDto: UpdatePageDto) {
    const page = await this.prisma.page.findUnique({ where: { id } });

    if (!page) {
      throw new NotFoundException(`Página con ID ${id} no encontrada`);
    }

    if (updateDto.slug && updateDto.slug !== page.slug) {
      const existing = await this.prisma.page.findUnique({
        where: { slug: updateDto.slug },
      });
      if (existing) {
        throw new ConflictException(
          `Ya existe una página con el slug "${updateDto.slug}"`,
        );
      }
    }

    // Si se publica, setear published_at
    const data: any = { ...updateDto };
    if (updateDto.is_published === true && !page.is_published) {
      data.published_at = new Date();
    }

    return this.prisma.page.update({
      where: { id },
      data,
      include: {
        sections: {
          orderBy: { display_order: 'asc' },
        },
      },
    });
  }

  async remove(id: string) {
    const page = await this.prisma.page.findUnique({ where: { id } });

    if (!page) {
      throw new NotFoundException(`Página con ID ${id} no encontrada`);
    }

    return this.prisma.page.delete({ where: { id } });
  }

  // --- Endpoints públicos ---

  async findBySlug(slug: string) {
    const page = await this.prisma.page.findUnique({
      where: { slug },
      include: {
        sections: {
          where: { is_active: true },
          orderBy: { display_order: 'asc' },
        },
      },
    });

    if (!page || !page.is_published || !page.is_active) {
      throw new NotFoundException(`Página "${slug}" no encontrada`);
    }

    return page;
  }

  async getNavigation() {
    const headerPages = await this.prisma.page.findMany({
      where: {
        show_in_header: true,
        is_active: true,
        is_published: true,
      },
      select: {
        id: true,
        slug: true,
        title: true,
        header_label: true,
        header_order: true,
      },
      orderBy: { header_order: 'asc' },
    });

    const footerPages = await this.prisma.page.findMany({
      where: {
        show_in_footer: true,
        is_active: true,
        is_published: true,
      },
      select: {
        id: true,
        slug: true,
        title: true,
        footer_label: true,
        footer_order: true,
      },
      orderBy: { footer_order: 'asc' },
    });

    return { header: headerPages, footer: footerPages };
  }
}
