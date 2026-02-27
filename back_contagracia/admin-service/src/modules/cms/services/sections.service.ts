import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateSectionDto,
  UpdateSectionDto,
  ReorderSectionsDto,
} from '../dto';

@Injectable()
export class SectionsService {
  constructor(private prisma: PrismaService) {}

  async findByPage(pageId: string) {
    await this.ensurePageExists(pageId);

    return this.prisma.siteSection.findMany({
      where: { page_id: pageId },
      orderBy: { display_order: 'asc' },
    });
  }

  async findOne(id: string) {
    const section = await this.prisma.siteSection.findUnique({
      where: { id },
    });

    if (!section) {
      throw new NotFoundException(`Sección con ID ${id} no encontrada`);
    }

    return section;
  }

  async create(pageId: string, createDto: CreateSectionDto) {
    await this.ensurePageExists(pageId);

    // Si no se especifica orden, ponerlo al final
    if (createDto.display_order === undefined) {
      const lastSection = await this.prisma.siteSection.findFirst({
        where: { page_id: pageId },
        orderBy: { display_order: 'desc' },
      });
      createDto.display_order = lastSection
        ? lastSection.display_order + 1
        : 0;
    }

    return this.prisma.siteSection.create({
      data: {
        ...createDto,
        page_id: pageId,
      },
    });
  }

  async update(id: string, updateDto: UpdateSectionDto) {
    const section = await this.prisma.siteSection.findUnique({
      where: { id },
    });

    if (!section) {
      throw new NotFoundException(`Sección con ID ${id} no encontrada`);
    }

    return this.prisma.siteSection.update({
      where: { id },
      data: updateDto,
    });
  }

  async remove(id: string) {
    const section = await this.prisma.siteSection.findUnique({
      where: { id },
    });

    if (!section) {
      throw new NotFoundException(`Sección con ID ${id} no encontrada`);
    }

    return this.prisma.siteSection.delete({ where: { id } });
  }

  async reorder(dto: ReorderSectionsDto) {
    const updates = dto.sections.map((item) =>
      this.prisma.siteSection.update({
        where: { id: item.id },
        data: { display_order: item.display_order },
      }),
    );

    await this.prisma.$transaction(updates);

    return { message: 'Secciones reordenadas exitosamente' };
  }

  async toggle(id: string) {
    const section = await this.prisma.siteSection.findUnique({
      where: { id },
    });

    if (!section) {
      throw new NotFoundException(`Sección con ID ${id} no encontrada`);
    }

    return this.prisma.siteSection.update({
      where: { id },
      data: { is_active: !section.is_active },
    });
  }

  private async ensurePageExists(pageId: string) {
    const page = await this.prisma.page.findUnique({
      where: { id: pageId },
    });

    if (!page) {
      throw new NotFoundException(`Página con ID ${pageId} no encontrada`);
    }
  }
}
