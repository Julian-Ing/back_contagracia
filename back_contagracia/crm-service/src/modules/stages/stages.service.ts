import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { ReorderStagesDto } from './dto/reorder-stages.dto';

@Injectable()
export class StagesService {
  private readonly logger = new Logger(StagesService.name);

  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async findAll(companyId: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.crmOpportunityStage.findMany({
      orderBy: { position: 'asc' },
    });
  }

  async create(companyId: string, dto: CreateStageDto): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    // Generate value from name if not provided
    const stageValue = dto.value || dto.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');

    // Check for duplicate value
    if (stageValue) {
      const existingValue = await db.crmOpportunityStage.findFirst({
        where: { value: stageValue },
      });
      if (existingValue) {
        throw new BadRequestException(`Ya existe una etapa con el valor "${stageValue}"`);
      }
    }

    // Validate unique is_won / is_lost
    if (dto.is_won) {
      const existingWon = await db.crmOpportunityStage.findFirst({
        where: { is_won: true, is_active: true },
      });
      if (existingWon) {
        throw new BadRequestException(`Ya existe una etapa "Ganado": ${existingWon.name}`);
      }
    }

    if (dto.is_lost) {
      const existingLost = await db.crmOpportunityStage.findFirst({
        where: { is_lost: true, is_active: true },
      });
      if (existingLost) {
        throw new BadRequestException(`Ya existe una etapa "Perdido": ${existingLost.name}`);
      }
    }

    if (dto.is_quoting_stage) {
      const existingQuoting = await db.crmOpportunityStage.findFirst({
        where: { is_quoting_stage: true, is_active: true },
      });
      if (existingQuoting) {
        throw new BadRequestException(`Ya existe una etapa de "Cotización": ${existingQuoting.name}`);
      }
    }

    // Get next position
    const maxPositionRecord = await db.crmOpportunityStage.findFirst({
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const nextPosition = (maxPositionRecord?.position ?? 0) + 1;

    return db.crmOpportunityStage.create({
      data: {
        value: stageValue,
        name: dto.name,
        color: dto.color ?? '#3B82F6',
        probability: dto.probability ?? 0,
        is_won: dto.is_won ?? false,
        is_lost: dto.is_lost ?? false,
        is_quoting_stage: dto.is_quoting_stage ?? false,
        is_initial_stage: dto.is_initial_stage ?? false,
        is_active: dto.is_active ?? true,
        position: nextPosition,
      },
    });
  }

  async update(companyId: string, id: string, dto: UpdateStageDto): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    // Check for duplicate value if updating value
    if (dto.value) {
      const existingValue = await db.crmOpportunityStage.findFirst({
        where: { value: dto.value, NOT: { id } },
      });
      if (existingValue) {
        throw new BadRequestException(`Ya existe una etapa con el valor "${dto.value}"`);
      }
    }

    // Validate unique is_won / is_lost
    if (dto.is_won === true) {
      const existingWon = await db.crmOpportunityStage.findFirst({
        where: { is_won: true, is_active: true, NOT: { id } },
      });
      if (existingWon) {
        throw new BadRequestException(`Ya existe una etapa "Ganado": ${existingWon.name}`);
      }
    }

    if (dto.is_lost === true) {
      const existingLost = await db.crmOpportunityStage.findFirst({
        where: { is_lost: true, is_active: true, NOT: { id } },
      });
      if (existingLost) {
        throw new BadRequestException(`Ya existe una etapa "Perdido": ${existingLost.name}`);
      }
    }

    if (dto.is_quoting_stage === true) {
      const existingQuoting = await db.crmOpportunityStage.findFirst({
        where: { is_quoting_stage: true, is_active: true, NOT: { id } },
      });
      if (existingQuoting) {
        throw new BadRequestException(`Ya existe una etapa de "Cotización": ${existingQuoting.name}`);
      }
    }

    return db.crmOpportunityStage.update({
      where: { id },
      data: dto,
    });
  }

  async reorder(companyId: string, dto: ReorderStagesDto): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const updates = dto.stages.map((stage) =>
      db.crmOpportunityStage.update({
        where: { id: stage.id },
        data: { position: stage.position },
      }),
    );

    await db.$transaction(updates);
    return { message: 'Etapas reordenadas correctamente' };
  }

  async remove(companyId: string, id: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.crmOpportunityStage.update({
      where: { id },
      data: { is_active: false },
    });
  }
}
