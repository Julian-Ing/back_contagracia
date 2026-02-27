import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTagDto, UpdateTagDto } from './dto';

@Injectable()
export class BlogTagsService {
  constructor(private prisma: PrismaService) {}

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async findAll() {
    return this.prisma.blogTag.findMany({
      include: {
        _count: { select: { post_tags: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const tag = await this.prisma.blogTag.findUnique({
      where: { id },
      include: {
        _count: { select: { post_tags: true } },
      },
    });

    if (!tag) {
      throw new NotFoundException(`Tag con ID ${id} no encontrado`);
    }

    return tag;
  }

  async create(createDto: CreateTagDto) {
    const existing = await this.prisma.blogTag.findUnique({
      where: { name: createDto.name },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe un tag con el nombre "${createDto.name}"`,
      );
    }

    const slug = createDto.slug || this.generateSlug(createDto.name);

    const existingSlug = await this.prisma.blogTag.findUnique({
      where: { slug },
    });
    if (existingSlug) {
      throw new ConflictException(`Ya existe un tag con el slug "${slug}"`);
    }

    return this.prisma.blogTag.create({
      data: { ...createDto, slug },
      include: { _count: { select: { post_tags: true } } },
    });
  }

  async update(id: string, updateDto: UpdateTagDto) {
    const tag = await this.prisma.blogTag.findUnique({ where: { id } });
    if (!tag) {
      throw new NotFoundException(`Tag con ID ${id} no encontrado`);
    }

    if (updateDto.name && updateDto.name !== tag.name) {
      const existing = await this.prisma.blogTag.findUnique({
        where: { name: updateDto.name },
      });
      if (existing) {
        throw new ConflictException(
          `Ya existe un tag con el nombre "${updateDto.name}"`,
        );
      }
    }

    if (updateDto.slug && updateDto.slug !== tag.slug) {
      const existingSlug = await this.prisma.blogTag.findUnique({
        where: { slug: updateDto.slug },
      });
      if (existingSlug) {
        throw new ConflictException(
          `Ya existe un tag con el slug "${updateDto.slug}"`,
        );
      }
    }

    // Auto-generate slug if name changed but no slug provided
    const data: any = { ...updateDto };
    if (updateDto.name && !updateDto.slug && updateDto.name !== tag.name) {
      data.slug = this.generateSlug(updateDto.name);
    }

    return this.prisma.blogTag.update({
      where: { id },
      data,
      include: { _count: { select: { post_tags: true } } },
    });
  }

  async remove(id: string) {
    const tag = await this.prisma.blogTag.findUnique({ where: { id } });
    if (!tag) {
      throw new NotFoundException(`Tag con ID ${id} no encontrado`);
    }

    return this.prisma.blogTag.delete({ where: { id } });
  }
}
