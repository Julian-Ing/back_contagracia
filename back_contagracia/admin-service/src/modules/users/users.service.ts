import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { RealtimePublisherService } from '@contagracia/shared-modules';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserStatusDto } from './dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private realtimePublisher: RealtimePublisherService,
  ) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 15;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { full_name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (query.status && query.status !== 'all') {
      where.is_active = query.status === 'active';
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    const data = users.map((user) => ({
      id: user.id,
      email: user.email,
      full_name: user.full_name || undefined,
      status: user.is_active ? 'active' : 'inactive',
      created_at: user.created_at.toISOString(),
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password_hash: passwordHash,
        full_name: dto.full_name || null,
        phone: dto.phone || null,
        email_verified: true,
        is_active: true,
      },
      select: {
        id: true,
        email: true,
        full_name: true,
        phone: true,
        is_active: true,
        email_verified: true,
        created_at: true,
      },
    });

    return user;
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    return this.prisma.user.delete({ where: { id } });
  }

  async updateStatus(id: string, dto: UpdateUserStatusDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    const result = await this.prisma.user.update({
      where: { id },
      data: { is_active: dto.status === 'active' },
      select: {
        id: true,
        email: true,
        is_active: true,
      },
    });

    // Notificar cambio en lista de usuarios master
    this.realtimePublisher.notifyMasterUserListChanged('status_changed', id);

    // Si se desactiva, forzar logout del usuario
    if (dto.status !== 'active') {
      this.realtimePublisher.forceLogoutUser(id, 'Tu cuenta ha sido desactivada');
    }

    return result;
  }
}
