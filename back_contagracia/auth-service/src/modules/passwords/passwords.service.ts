import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaClient as TenantPrismaClient } from '@prisma/client-tenant';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { ChangePasswordDto } from '../auth/dto';
import { ForgotPasswordDto, ResetPasswordDto, VerifyResetCodeDto } from './dto';

@Injectable()
export class PasswordsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * Generar código de 6 dígitos
   */
  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Construir URL de conexión a la base de datos del tenant
   */
  private buildDatabaseUrl(company: {
    db_host: string;
    db_port: number;
    db_name: string;
    db_user: string;
    db_password: string;
  }): string {
    return `postgresql://${company.db_user}:${company.db_password}@${company.db_host}:${company.db_port}/${company.db_name}?schema=public`;
  }

  /**
   * Cambiar contraseña del usuario actual
   * userType: 'system_admin' | 'company_user'
   * userId: user_id (master) o tenant_user_id (tenant)
   * companyId: solo para company_user
   */
  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
    userType: string,
    companyId?: string,
  ) {
    const { current_password, new_password } = changePasswordDto;

    // ========================================
    // Admin del sistema (User en master)
    // ========================================
    if (userType === 'system_admin') {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      const isPasswordValid = await bcrypt.compare(
        current_password,
        user.password_hash,
      );

      if (!isPasswordValid) {
        throw new UnauthorizedException('La contraseña actual es incorrecta');
      }

      const isSamePassword = await bcrypt.compare(
        new_password,
        user.password_hash,
      );

      if (isSamePassword) {
        throw new BadRequestException(
          'La nueva contraseña debe ser diferente a la actual',
        );
      }

      const hashedPassword = await bcrypt.hash(new_password, 10);

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          password_hash: hashedPassword,
          password_changed_at: new Date(),
        },
      });

      return {
        message: 'Contraseña cambiada exitosamente',
      };
    }

    // ========================================
    // Usuario de empresa (TenantUser en tenant)
    // ========================================
    if (!companyId) {
      throw new BadRequestException('Company ID requerido para usuarios de empresa');
    }

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }

    const tenantPrisma = new TenantPrismaClient({
      datasources: {
        db: { url: this.buildDatabaseUrl(company) },
      },
    });

    try {
      const tenantUser = await tenantPrisma.tenantUser.findUnique({
        where: { id: userId },
      });

      if (!tenantUser) {
        throw new NotFoundException('Usuario no encontrado');
      }

      const isPasswordValid = await bcrypt.compare(
        current_password,
        tenantUser.password_hash,
      );

      if (!isPasswordValid) {
        throw new UnauthorizedException('La contraseña actual es incorrecta');
      }

      const isSamePassword = await bcrypt.compare(
        new_password,
        tenantUser.password_hash,
      );

      if (isSamePassword) {
        throw new BadRequestException(
          'La nueva contraseña debe ser diferente a la actual',
        );
      }

      const hashedPassword = await bcrypt.hash(new_password, 10);

      await tenantPrisma.tenantUser.update({
        where: { id: userId },
        data: {
          password_hash: hashedPassword,
          must_change_password: false,
        },
      });

      return {
        message: 'Contraseña cambiada exitosamente',
      };
    } finally {
      await tenantPrisma.$disconnect();
    }
  }

  /**
   * Enviar código de verificación para recuperar contraseña
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email, nit } = forgotPasswordDto;
    const normalizedEmail = email.toLowerCase().trim();

    // ========================================
    // Con NIT = Usuario de empresa (TenantUser)
    // ========================================
    if (nit) {
      const company = await this.prisma.company.findUnique({
        where: { nit: nit.trim() },
      });

      if (!company) {
        throw new BadRequestException('NIT de empresa no encontrado');
      }

      const tenantPrisma = new TenantPrismaClient({
        datasources: {
          db: { url: this.buildDatabaseUrl(company) },
        },
      });

      try {
        const tenantUser = await tenantPrisma.tenantUser.findUnique({
          where: { email: normalizedEmail },
        });

        if (!tenantUser) {
          throw new BadRequestException('Usuario no encontrado en esta empresa');
        }

        // Invalidar códigos anteriores para este email
        await this.prisma.passwordReset.updateMany({
          where: {
            email: normalizedEmail,
            used: false,
          },
          data: {
            used: true,
          },
        });

        // Crear código de reset
        const code = this.generateVerificationCode();
        const resetToken = randomUUID();
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15);

        const tokenWithCode = `${code}_${resetToken}`;
        await this.prisma.passwordReset.create({
          data: {
            email: normalizedEmail,
            token: tokenWithCode,
            expires_at: expiresAt,
            metadata: {
              tenant_user_id: tenantUser.id,
              company_id: company.id,
            },
          },
        });

        // Enviar email con código
        await this.emailService.sendPasswordResetCode(normalizedEmail, code);

        return {
          message: 'Si el email existe, recibirás un código de verificación',
          expires_in: 900,
        };
      } finally {
        await tenantPrisma.$disconnect();
      }
    }

    // ========================================
    // Sin NIT = Admin del sistema (User en master)
    // ========================================
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new BadRequestException('Email no registrado');
    }

    // Invalidar códigos anteriores
    await this.prisma.passwordReset.updateMany({
      where: {
        email: normalizedEmail,
        used: false,
      },
      data: {
        used: true,
      },
    });

    // Crear código de reset
    const code = this.generateVerificationCode();
    const resetToken = randomUUID();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    const tokenWithCode = `${code}_${resetToken}`;
    await this.prisma.passwordReset.create({
      data: {
        user_id: user.id,
        email: normalizedEmail,
        token: tokenWithCode,
        expires_at: expiresAt,
      },
    });

    // Enviar email con código
    await this.emailService.sendPasswordResetCode(normalizedEmail, code);

    return {
      message: 'Si el email existe, recibirás un código de verificación',
      expires_in: 900,
    };
  }

  /**
   * Verificar código de recuperación y devolver token para resetear
   */
  async verifyResetCode(verifyResetCodeDto: VerifyResetCodeDto) {
    const { email, code } = verifyResetCodeDto;
    const normalizedEmail = email.toLowerCase().trim();

    // Buscar reset por email que tenga el código en el token
    const passwordResets = await this.prisma.passwordReset.findMany({
      where: {
        email: normalizedEmail,
        used: false,
        token: {
          startsWith: `${code}_`,
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    const passwordReset = passwordResets[0];

    if (!passwordReset) {
      throw new BadRequestException('Código inválido o expirado');
    }

    if (new Date() > passwordReset.expires_at) {
      throw new BadRequestException('El código ha expirado. Solicita uno nuevo.');
    }

    // Generar nuevo token para el reset (válido por 30 minutos)
    const resetToken = randomUUID();
    const resetExpires = new Date();
    resetExpires.setMinutes(resetExpires.getMinutes() + 30);

    // Marcar el código como usado y crear nuevo registro con el token limpio
    await this.prisma.$transaction([
      this.prisma.passwordReset.update({
        where: { id: passwordReset.id },
        data: { used: true },
      }),
      this.prisma.passwordReset.create({
        data: {
          user_id: passwordReset.user_id,
          email: normalizedEmail,
          token: resetToken,
          expires_at: resetExpires,
          metadata: passwordReset.metadata,
          used: false,
        },
      }),
    ]);

    return {
      message: 'Código verificado correctamente',
      reset_token: resetToken,
      expires_in: 1800,
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, new_password } = resetPasswordDto;

    // Buscar token de reset
    const resetToken = await this.prisma.passwordReset.findUnique({
      where: { token },
    });

    if (!resetToken) {
      throw new NotFoundException('Token de reset inválido');
    }

    if (resetToken.used) {
      throw new BadRequestException('Este token ya ha sido utilizado');
    }

    if (new Date() > resetToken.expires_at) {
      throw new BadRequestException('El token de reset ha expirado');
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);
    const metadata = resetToken.metadata as { tenant_user_id?: string; company_id?: string } | null;

    // ========================================
    // Usuario de empresa (TenantUser en tenant)
    // ========================================
    if (metadata?.tenant_user_id && metadata?.company_id) {
      const company = await this.prisma.company.findUnique({
        where: { id: metadata.company_id },
      });

      if (!company) {
        throw new NotFoundException('Empresa no encontrada');
      }

      const tenantPrisma = new TenantPrismaClient({
        datasources: {
          db: { url: this.buildDatabaseUrl(company) },
        },
      });

      try {
        await tenantPrisma.tenantUser.update({
          where: { id: metadata.tenant_user_id },
          data: {
            password_hash: hashedPassword,
            must_change_password: false,
          },
        });

        // Marcar token como usado
        await this.prisma.passwordReset.update({
          where: { id: resetToken.id },
          data: { used: true },
        });

        // Invalidar sesiones del usuario de empresa
        const activeSessions = await this.prisma.session.findMany({
          where: {
            is_active: true,
            user_id: null,
          },
        });

        const sessionIds = activeSessions
          .filter((s) => {
            const meta = s.metadata as { tenant_user_id?: string } | null;
            return meta?.tenant_user_id === metadata.tenant_user_id;
          })
          .map((s) => s.id);

        if (sessionIds.length > 0) {
          await this.prisma.session.updateMany({
            where: { id: { in: sessionIds } },
            data: { is_active: false },
          });
        }

        return {
          message: 'Contraseña restablecida exitosamente. Ya puedes iniciar sesión.',
        };
      } finally {
        await tenantPrisma.$disconnect();
      }
    }

    // ========================================
    // Admin del sistema (User en master)
    // ========================================
    if (!resetToken.user_id) {
      throw new BadRequestException('Token de reset inválido');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.user_id },
        data: {
          password_hash: hashedPassword,
          password_changed_at: new Date(),
        },
      }),
      this.prisma.passwordReset.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
      this.prisma.session.updateMany({
        where: {
          user_id: resetToken.user_id,
          is_active: true,
        },
        data: {
          is_active: false,
        },
      }),
    ]);

    return {
      message: 'Contraseña restablecida exitosamente. Ya puedes iniciar sesión.',
    };
  }
}
