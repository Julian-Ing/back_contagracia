import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const PUBLIC_METADATA_KEYS = [
  'site_title',
  'site_description',
  'site_keywords',
  'og_image_url',
  'favicon_url',
];

@Injectable()
export class SiteSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.siteSetting.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async findOne(key: string) {
    const setting = await this.prisma.siteSetting.findUnique({
      where: { key },
    });
    if (!setting) {
      throw new NotFoundException(`Setting "${key}" no encontrado`);
    }
    return setting;
  }

  async upsert(key: string, value: string | null) {
    return this.prisma.siteSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  async getPublicMetadata() {
    const settings = await this.prisma.siteSetting.findMany({
      where: { key: { in: PUBLIC_METADATA_KEYS } },
    });

    const result: Record<string, string | null> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }
    return result;
  }
}
