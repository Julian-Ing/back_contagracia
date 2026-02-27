import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSystemActionDto, UpdateSystemActionDto } from './dto';

@Injectable()
export class SystemActionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(moduleKey?: string) {
    return this.prisma.systemAction.findMany({
      where: moduleKey
        ? {
            module: {
              module_key: moduleKey,
            },
          }
        : undefined,
      include: {
        module: true,
      },
      orderBy: [{ module: { module_key: 'asc' } }, { action_key: 'asc' }],
    });
  }

  async findOne(id: string) {
    const action = await this.prisma.systemAction.findUnique({
      where: { id },
      include: {
        module: true,
      },
    });

    if (!action) {
      throw new NotFoundException(`Acción con ID ${id} no encontrada`);
    }

    return action;
  }

  async findByKey(actionKey: string) {
    const action = await this.prisma.systemAction.findUnique({
      where: { action_key: actionKey },
      include: {
        module: true,
      },
    });

    if (!action) {
      throw new NotFoundException(`Acción con key ${actionKey} no encontrada`);
    }

    return action;
  }

  async getModules() {
    const modules = await this.prisma.module.findMany({
      where: { is_active: true },
      select: { module_key: true },
      orderBy: { module_key: 'asc' },
    });

    return modules.map((m) => m.module_key);
  }

  async getModulesFull(search?: string) {
    const where: any = { is_active: true };

    // Búsqueda fuzzy por clave o nombre (pg_trgm)
    if (search) {
      const searchPattern = `%${search}%`;
      const fuzzyMatches = await this.prisma.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "modules"
        WHERE "module_key" ILIKE ${searchPattern}
        OR "module_name" ILIKE ${searchPattern}
        OR word_similarity(${search}, COALESCE("module_name", '')) > 0.3
        OR word_similarity(${search}, COALESCE("module_key", '')) > 0.3
      `;
      const matchIds = fuzzyMatches.map(r => r.id);
      if (matchIds.length > 0) {
        where.id = { in: matchIds };
      } else {
        where.id = { in: [] };
      }
    }

    return this.prisma.module.findMany({
      where,
      include: {
        dependencies: {
          include: {
            depends_on: { select: { id: true, module_key: true, module_name: true } },
          },
        },
        dependents: {
          include: {
            module: { select: { id: true, module_key: true, module_name: true } },
          },
        },
      },
      orderBy: { sort_order: 'asc' },
    });
  }

  async create(createDto: CreateSystemActionDto) {
    const existing = await this.prisma.systemAction.findUnique({
      where: { action_key: createDto.action_key },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe una acción con la clave ${createDto.action_key}`,
      );
    }

    const module = await this.prisma.module.findUnique({
      where: { id: createDto.module_id },
    });

    if (!module) {
      throw new BadRequestException(
        `El módulo con ID ${createDto.module_id} no existe`,
      );
    }

    return this.prisma.systemAction.create({
      data: createDto,
      include: {
        module: true,
      },
    });
  }

  async update(id: string, updateDto: UpdateSystemActionDto) {
    const action = await this.prisma.systemAction.findUnique({
      where: { id },
    });

    if (!action) {
      throw new NotFoundException(`Acción con ID ${id} no encontrada`);
    }

    if (updateDto.module_id) {
      const module = await this.prisma.module.findUnique({
        where: { id: updateDto.module_id },
      });

      if (!module) {
        throw new BadRequestException(
          `El módulo con ID ${updateDto.module_id} no existe`,
        );
      }
    }

    return this.prisma.systemAction.update({
      where: { id },
      data: updateDto,
      include: {
        module: true,
      },
    });
  }

  async remove(id: string) {
    const action = await this.prisma.systemAction.findUnique({
      where: { id },
    });

    if (!action) {
      throw new NotFoundException(`Acción con ID ${id} no encontrada`);
    }

    return this.prisma.systemAction.delete({
      where: { id },
    });
  }
}
