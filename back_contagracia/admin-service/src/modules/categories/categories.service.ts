import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.companyCategory.findMany({
      include: {
        _count: {
          select: { assignments: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.companyCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { assignments: true },
        },
        assignments: {
          include: {
            company: {
              select: {
                id: true,
                company_name: true,
                nit: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
    }

    return category;
  }

  async create(createDto: CreateCategoryDto) {
    const existing = await this.prisma.companyCategory.findUnique({
      where: { name: createDto.name },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe una categoría con el nombre "${createDto.name}"`,
      );
    }

    return this.prisma.companyCategory.create({
      data: createDto,
      include: {
        _count: {
          select: { assignments: true },
        },
      },
    });
  }

  async update(id: string, updateDto: UpdateCategoryDto) {
    const category = await this.prisma.companyCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
    }

    if (updateDto.name && updateDto.name !== category.name) {
      const existing = await this.prisma.companyCategory.findUnique({
        where: { name: updateDto.name },
      });
      if (existing) {
        throw new ConflictException(
          `Ya existe una categoría con el nombre "${updateDto.name}"`,
        );
      }
    }

    return this.prisma.companyCategory.update({
      where: { id },
      data: updateDto,
      include: {
        _count: {
          select: { assignments: true },
        },
      },
    });
  }

  async remove(id: string) {
    const category = await this.prisma.companyCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
    }

    return this.prisma.companyCategory.delete({
      where: { id },
    });
  }
}
