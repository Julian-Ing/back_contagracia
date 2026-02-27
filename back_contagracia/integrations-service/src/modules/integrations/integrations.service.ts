import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IntegrationsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.integration.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { id },
      include: { keys: true },
    });
    if (!integration) {
      throw new NotFoundException('Integración no encontrada');
    }
    return integration;
  }

  async findByCode(code: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { code },
      include: { keys: true },
    });
    if (!integration) {
      throw new NotFoundException('Integración no encontrada');
    }
    return integration;
  }

  async getKeys(integrationId: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { id: integrationId },
    });
    if (!integration) {
      throw new NotFoundException('Integración no encontrada');
    }
    return this.prisma.integrationKey.findMany({
      where: { integration_id: integrationId },
      orderBy: { key_name: 'asc' },
    });
  }

  async updateKey(keyId: string, value: string) {
    const key = await this.prisma.integrationKey.findUnique({
      where: { id: keyId },
    });
    if (!key) {
      throw new NotFoundException('Clave no encontrada');
    }
    return this.prisma.integrationKey.update({
      where: { id: keyId },
      data: { key_value: value },
    });
  }

  async updateKeys(integrationId: string, keys: { key_name: string; key_value: string }[]) {
    const integration = await this.prisma.integration.findUnique({
      where: { id: integrationId },
    });
    if (!integration) {
      throw new NotFoundException('Integración no encontrada');
    }

    const results: { key_name: string; updated: boolean }[] = [];
    for (const key of keys) {
      const updated = await this.prisma.integrationKey.updateMany({
        where: {
          integration_id: integrationId,
          key_name: key.key_name,
        },
        data: { key_value: key.key_value },
      });
      results.push({ key_name: key.key_name, updated: updated.count > 0 });
    }
    return results;
  }

  async toggleActive(id: string, is_active: boolean) {
    const integration = await this.prisma.integration.findUnique({
      where: { id },
    });
    if (!integration) {
      throw new NotFoundException('Integración no encontrada');
    }
    return this.prisma.integration.update({
      where: { id },
      data: { is_active },
    });
  }
}
