import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaClient as TenantPrismaClient } from '@prisma/client-tenant';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RegisterDto, LoginDto, VerifyEmailDto, SendVerificationCodeDto, VerifyCodeDto } from './dto';
import { JwtPayload, RealtimePublisherService } from '@contagracia/shared-modules';
import { LoginResponse, RefreshResponse } from './interfaces/auth-response.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    private realtimePublisher: RealtimePublisherService,
  ) {}

  /**
   * Firma un refresh token como JWT (contiene sub + session_id)
   * para que RefreshTokenStrategy pueda validarlo.
   */
  private signRefreshToken(sub: string, sessionId: string): string {
    const expiresIn = this.configService.get<string>('REFRESH_TOKEN_EXPIRATION', '7d');
    return this.jwtService.sign(
      { sub, session_id: sessionId, type: 'refresh' },
      { expiresIn: expiresIn as any },
    );
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
   * Obtener módulos habilitados del plan
   */
  private getEnabledModules(planModules: { module: { module_key: string } }[]): string[] {
    return planModules.map((pm) => pm.module.module_key);
  }

  /**
   * Obtener módulos visibles según las acciones permitidas del usuario
   * Un usuario solo ve un módulo si tiene al menos una acción en él
   */
  private getVisibleModules(
    planModules: { module: { module_key: string; actions: { action_key: string }[] } }[],
    userActions: string[],
  ): string[] {
    const userActionsSet = new Set(userActions);
    const visibleModules: string[] = [];

    for (const pm of planModules) {
      // Si el usuario tiene al menos una acción de este módulo, puede verlo
      const hasActionInModule = pm.module.actions.some((a) => userActionsSet.has(a.action_key));
      if (hasActionInModule) {
        visibleModules.push(pm.module.module_key);
      }
    }

    return visibleModules;
  }

  /**
   * Resolver permisos (action_keys) del usuario según su rol y overrides
   * Owner/Admin tienen bypass total: obtienen todas las acciones de los módulos del plan
   * Otros usuarios: solo las acciones asignadas a su rol
   */
  private async resolveUserPermissions(
    tenantPrisma: TenantPrismaClient,
    tenantUser: { id: string; role_id: string | null; role: { role_key: string } | null },
    planModules: { module: { module_key: string; actions: { action_key: string }[] } }[],
  ): Promise<string[]> {
    // Todas las action_keys de los módulos del plan
    const allPlanActions = planModules.flatMap((pm) =>
      pm.module.actions.map((a) => a.action_key),
    );

    // Owner y Admin bypass: todas las acciones del plan
    const roleKey = tenantUser.role?.role_key;
    if (roleKey === 'owner' || roleKey === 'admin') {
      return allPlanActions;
    }

    // Si no tiene rol asignado, no tiene permisos
    if (!tenantUser.role_id) {
      return [];
    }

    // Permisos del rol
    const rolePermissions = await tenantPrisma.rolePermission.findMany({
      where: { role_id: tenantUser.role_id, granted: true },
      select: { action_key: true },
    });

    const roleActions = new Set(rolePermissions.map((rp) => rp.action_key));

    // Overrides del usuario
    const userPermissions = await tenantPrisma.tenantUserPermission.findMany({
      where: { tenant_user_id: tenantUser.id },
      select: { action_key: true, granted: true },
    });

    for (const up of userPermissions) {
      if (up.granted) {
        roleActions.add(up.action_key);
      } else {
        roleActions.delete(up.action_key);
      }
    }

    // Filtrar solo acciones que pertenecen a módulos del plan
    const planActionSet = new Set(allPlanActions);
    return [...roleActions].filter((a) => planActionSet.has(a));
  }

  async register(registerDto: RegisterDto, ipAddress?: string) {
    const { email, password, full_name } = registerDto;

    // Verificar si el usuario ya existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const user = await this.prisma.user.create({
      data: {
        email,
        password_hash: hashedPassword,
        full_name,
        email_verified: false,
      },
    });

    // Crear token de verificación de email
    const verificationToken = randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 horas

    await this.prisma.emailVerification.create({
      data: {
        user_id: user.id,
        email: user.email,
        token: verificationToken,
        expires_at: expiresAt,
      },
    });

    // TODO: Emitir evento a RabbitMQ para enviar email de verificación

    return {
      message: 'Usuario registrado exitosamente. Por favor verifica tu email.',
      user_id: user.id,
    };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const { token } = verifyEmailDto;

    const verification = await this.prisma.emailVerification.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verification) {
      throw new NotFoundException('Token de verificación inválido');
    }

    if (verification.verified) {
      throw new BadRequestException('El email ya ha sido verificado');
    }

    if (new Date() > verification.expires_at) {
      throw new BadRequestException('El token de verificación ha expirado');
    }

    // Marcar email como verificado
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: verification.user_id },
        data: { email_verified: true },
      }),
      this.prisma.emailVerification.update({
        where: { id: verification.id },
        data: { verified: true },
      }),
    ]);

    return {
      message: 'Email verificado exitosamente',
    };
  }

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string): Promise<LoginResponse> {
    const { nit, email, password } = loginDto;
    const normalizedEmail = email.toLowerCase().trim();

    // ========================================
    // LOGIN SIN NIT = Admin del sistema (master)
    // Solo admins del sistema pueden loguearse sin NIT
    // ========================================
    if (!nit) {
      const user = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (!user) {
        throw new UnauthorizedException('Credenciales inválidas');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Credenciales inválidas');
      }

      if (!user.email_verified) {
        throw new UnauthorizedException(
          'Por favor verifica tu email antes de iniciar sesión',
        );
      }

      // Crear sesión en master
      const sessionId = randomUUID();
      const refreshToken = this.signRefreshToken(user.id, sessionId);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await this.prisma.session.create({
        data: {
          user_id: user.id,
          session_id: sessionId,
          refresh_token: refreshToken,
          ip_address: ipAddress,
          user_agent: userAgent,
          expires_at: expiresAt,
          is_active: true,
        },
      });

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          last_login_at: new Date(),
          last_login_ip: ipAddress,
        },
      });

      const payload = {
        sub: user.id,
        email: user.email,
        user_type: 'system_admin',
        session_id: sessionId,
      };

      const access_token = this.jwtService.sign(payload, { expiresIn: '1h' });

      // Notificar desplazamiento a sesiones existentes de este admin (cross-browser vía WS)
      this.realtimePublisher.notifySessionDisplaced(
        user.id,
        sessionId,
        'Se inició sesión en otro lugar',
        userAgent,
      ).catch((err) => this.logger.warn(`[Displacement] Error: ${err.message}`));

      return {
        access_token,
        refresh_token: refreshToken,
        user_type: 'system_admin',
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
        },
        role: 'super_admin',
      };
    }

    // ========================================
    // LOGIN CON NIT = Usuario de empresa (tenant)
    // Valida contra TenantUser en la base de datos del tenant
    // ========================================
    const company = await this.prisma.company.findUnique({
      where: { nit: nit.trim() },
    });

    if (!company) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!company.is_active) {
      throw new UnauthorizedException(
        'La compañía está inactiva. Contacta a soporte.',
      );
    }

    // Conectar a la base de datos del tenant
    const tenantPrisma = new TenantPrismaClient({
      datasources: {
        db: { url: this.buildDatabaseUrl(company) },
      },
    });

    try {
      // Buscar TenantUser por email en el tenant
      const tenantUser = await tenantPrisma.tenantUser.findUnique({
        where: { email: normalizedEmail },
        include: {
          role: true,
        },
      });

      if (!tenantUser) {
        throw new UnauthorizedException('Credenciales inválidas');
      }

      if (!tenantUser.is_active) {
        throw new UnauthorizedException(
          'Tu cuenta está inactiva. Contacta al administrador.',
        );
      }

      // Verificar contraseña contra TenantUser
      const isPasswordValid = await bcrypt.compare(password, tenantUser.password_hash);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Credenciales inválidas');
      }

      // Actualizar último login en tenant
      await tenantPrisma.tenantUser.update({
        where: { id: tenantUser.id },
        data: {
          last_login_at: new Date(),
          last_login_ip: ipAddress,
        },
      });

      // Obtener suscripción activa con módulos del plan (desde master)
      const subscription = await this.prisma.subscription.findFirst({
        where: {
          company_id: company.id,
          OR: [{ ends_at: null }, { ends_at: { gte: new Date() } }],
        },
        include: {
          plan: {
            include: {
              plan_modules: {
                include: {
                  module: {
                    include: { actions: true },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      if (!subscription) {
        throw new UnauthorizedException(
          'La compañía no tiene una suscripción activa',
        );
      }

      // Resolver permisos del usuario (role + overrides)
      const resolvedActions = await this.resolveUserPermissions(
        tenantPrisma,
        tenantUser,
        subscription.plan.plan_modules,
      );

      // Módulos visibles: owner/admin ven todos, otros solo donde tienen acciones
      const isPrivileged = tenantUser.role.role_key === 'owner' || tenantUser.role.role_key === 'admin';
      const visibleModules = isPrivileged
        ? this.getEnabledModules(subscription.plan.plan_modules)
        : this.getVisibleModules(subscription.plan.plan_modules, resolvedActions);

      // Crear sesión en master (para tracking general)
      const sessionId = randomUUID();
      const refreshToken = this.signRefreshToken(tenantUser.id, sessionId);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Nota: Usamos tenant_user_id en vez de user_id ya que no hay User en master
      // Guardamos el session con referencia al company_id
      await this.prisma.session.create({
        data: {
          session_id: sessionId,
          refresh_token: refreshToken,
          ip_address: ipAddress,
          user_agent: userAgent,
          expires_at: expiresAt,
          is_active: true,
          // Guardamos info del tenant user en metadata
          metadata: {
            tenant_user_id: tenantUser.id,
            company_id: company.id,
          },
        },
      });

      // Generar JWT LIVIANO (sin database_url ni permissions para reducir tamaño)
      // Los servicios obtienen database_url y verifican permisos en tiempo real
      const payload = {
        sub: tenantUser.id,
        email: tenantUser.email,
        user_type: 'company_user',
        company_id: company.id,
        tenant_id: company.tenant_id,
        role: tenantUser.role.role_key,
        session_id: sessionId,
      };

      const access_token = this.jwtService.sign(payload, { expiresIn: '1h' });

      // Notificar desplazamiento a sesiones existentes de este tenant user (cross-browser vía WS)
      this.realtimePublisher.notifySessionDisplaced(
        tenantUser.id,
        sessionId,
        'Se inició sesión en otro lugar',
        userAgent,
      ).catch((err) => this.logger.warn(`[Displacement] Error: ${err.message}`));

      return {
        access_token,
        refresh_token: refreshToken,
        user_type: 'company_user',
        user: {
          id: tenantUser.id,
          email: tenantUser.email,
          full_name: tenantUser.full_name,
        },
        company: {
          id: company.id,
          name: company.company_name,
          nit: company.nit,
          logo_url: company.logo_url,
        },
        subscription: {
          plan_id: subscription.plan_id,
          plan_name: subscription.plan.name,
        },
        permissions: {
          modules: visibleModules,
          actions: resolvedActions,
        },
        role: tenantUser.role.role_key,
        must_change_password: tenantUser.must_change_password,
      };
    } finally {
      await tenantPrisma.$disconnect();
    }
  }

  async refresh(refreshToken: string, sessionId: string): Promise<RefreshResponse> {
    // Buscar sesión
    const session = await this.prisma.session.findUnique({
      where: { refresh_token: refreshToken },
      include: {
        user: true,
      },
    });

    if (!session) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    if (session.session_id !== sessionId) {
      throw new UnauthorizedException('Session ID no coincide');
    }

    if (!session.is_active) {
      throw new UnauthorizedException('Sesión inactiva');
    }

    if (new Date() > session.expires_at) {
      throw new UnauthorizedException('Refresh token expirado');
    }

    // Determinar sub para firmar el nuevo refresh token
    const metadata = session.metadata as { tenant_user_id: string; company_id: string } | null;
    const sub = session.user_id || metadata?.tenant_user_id;
    if (!sub) {
      throw new UnauthorizedException('Sesión inválida');
    }

    // Rotar refresh token (one-time use) — firmado como JWT
    const newRefreshToken = this.signRefreshToken(sub, session.session_id);
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        refresh_token: newRefreshToken,
        expires_at: newExpiresAt,
        last_activity: new Date(),
      },
    });

    // ========================================
    // Sesión de admin del sistema (user_id presente)
    // ========================================
    if (session.user_id && session.user) {
      const payload = {
        sub: session.user.id,
        email: session.user.email,
        user_type: 'system_admin',
        session_id: session.session_id,
      };

      const access_token = this.jwtService.sign(payload, { expiresIn: '1h' });

      return {
        access_token,
        refresh_token: newRefreshToken,
      };
    }

    // ========================================
    // Sesión de usuario de empresa (metadata con tenant_user_id, company_id)
    // ========================================
    if (!metadata?.tenant_user_id || !metadata?.company_id) {
      throw new UnauthorizedException('Sesión inválida');
    }

    // Obtener company para conectar al tenant
    const company = await this.prisma.company.findUnique({
      where: { id: metadata.company_id },
    });

    if (!company || !company.is_active) {
      throw new UnauthorizedException('Empresa no encontrada o inactiva');
    }

    // Conectar al tenant para obtener datos del usuario
    const tenantPrisma = new TenantPrismaClient({
      datasources: {
        db: { url: this.buildDatabaseUrl(company) },
      },
    });

    try {
      const tenantUser = await tenantPrisma.tenantUser.findUnique({
        where: { id: metadata.tenant_user_id },
        include: { role: true },
      });

      if (!tenantUser || !tenantUser.is_active) {
        throw new UnauthorizedException('Usuario no encontrado o inactivo');
      }

      // Obtener suscripción con módulos y acciones
      const subscription = await this.prisma.subscription.findFirst({
        where: {
          company_id: company.id,
          OR: [{ ends_at: null }, { ends_at: { gte: new Date() } }],
        },
        include: {
          plan: {
            include: {
              plan_modules: {
                include: {
                  module: {
                    include: { actions: true },
                  },
                },
              },
            },
          },
        },
      });

      const enabledModules = subscription
        ? this.getEnabledModules(subscription.plan.plan_modules)
        : [];

      // Re-resolver permisos para reflejar cambios
      const resolvedActions = subscription
        ? await this.resolveUserPermissions(tenantPrisma, tenantUser, subscription.plan.plan_modules)
        : [];

      // JWT LIVIANO (sin database_url ni permissions)
      const payload = {
        sub: tenantUser.id,
        email: tenantUser.email,
        user_type: 'company_user',
        company_id: company.id,
        tenant_id: company.tenant_id,
        role: tenantUser.role.role_key,
        session_id: session.session_id,
      };

      const access_token = this.jwtService.sign(payload, { expiresIn: '1h' });

      return {
        access_token,
        refresh_token: newRefreshToken,
      };
    } finally {
      await tenantPrisma.$disconnect();
    }
  }

  /**
   * Cerrar sesión específica
   * Funciona tanto para admins del sistema (user_id) como usuarios de empresa (session_id)
   */
  async logout(sessionId: string, userId?: string) {
    // Si hay user_id, es admin del sistema
    if (userId) {
      await this.prisma.session.updateMany({
        where: {
          user_id: userId,
          session_id: sessionId,
          is_active: true,
        },
        data: {
          is_active: false,
        },
      });
    } else {
      // Para usuarios de empresa, cerramos por session_id
      await this.prisma.session.updateMany({
        where: {
          session_id: sessionId,
          is_active: true,
        },
        data: {
          is_active: false,
        },
      });
    }

    return {
      message: 'Sesión cerrada exitosamente',
    };
  }

  /**
   * Cerrar todas las sesiones de un usuario
   * Para admins usa user_id, para empresa usa metadata.tenant_user_id
   */
  async logoutAll(userId?: string, tenantUserId?: string) {
    if (userId) {
      // Admin del sistema: cerrar por user_id
      await this.prisma.session.updateMany({
        where: {
          user_id: userId,
          is_active: true,
        },
        data: {
          is_active: false,
        },
      });
    } else if (tenantUserId) {
      // Usuario de empresa: necesitamos buscar sesiones con ese tenant_user_id en metadata
      // Prisma no permite filtrar directamente por JSON, así que obtenemos todas las activas y filtramos
      const activeSessions = await this.prisma.session.findMany({
        where: {
          is_active: true,
          user_id: null, // Solo sesiones de empresa (sin user_id)
        },
      });

      const sessionIds = activeSessions
        .filter((s) => {
          const meta = s.metadata as { tenant_user_id?: string } | null;
          return meta?.tenant_user_id === tenantUserId;
        })
        .map((s) => s.id);

      if (sessionIds.length > 0) {
        await this.prisma.session.updateMany({
          where: {
            id: { in: sessionIds },
          },
          data: {
            is_active: false,
          },
        });
      }
    }

    return {
      message: 'Todas las sesiones han sido cerradas',
    };
  }

  /**
   * Reclamar sesión desplazada: notifica a las demás sesiones que esta es la activa.
   */
  async reclaimSession(sessionId: string, userId: string, userAgent?: string): Promise<{ message: string }> {
    const session = await this.prisma.session.findUnique({
      where: { session_id: sessionId },
    });

    if (!session || !session.is_active) {
      throw new UnauthorizedException('Sesión no encontrada o inactiva');
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { last_activity: new Date() },
    });

    await this.realtimePublisher.notifySessionDisplaced(
      userId,
      sessionId,
      'Sesión reclamada desde otro dispositivo',
      userAgent,
    );

    return { message: 'Sesión reclamada exitosamente' };
  }

  /**
   * Generar código de 6 dígitos
   */
  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Enviar código de verificación al email (pre-registro)
   */
  async sendVerificationCode(dto: SendVerificationCodeDto) {
    const { email } = dto;
    const normalizedEmail = email.toLowerCase().trim();

    // Verificar si el email ya está registrado (solo para registro, no para cambio de email)
    const purpose = dto.purpose || 'registration';
    if (purpose === 'registration') {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUser) {
        throw new ConflictException('Este email ya está registrado');
      }
    }

    // Generar código de 6 dígitos
    const code = this.generateVerificationCode();
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutos

    // Invalidar códigos anteriores para este email
    await this.prisma.emailVerification.updateMany({
      where: {
        email: normalizedEmail,
        verified: false,
      },
      data: {
        verified: true, // Marcar como usado para invalidar
      },
    });

    // Crear nuevo registro de verificación
    await this.prisma.emailVerification.create({
      data: {
        email: normalizedEmail,
        token,
        code,
        expires_at: expiresAt,
        verified: false,
      },
    });

    // Enviar email con código
    await this.emailService.sendVerificationCode(normalizedEmail, code);

    return {
      message: 'Código de verificación enviado',
      email: normalizedEmail,
      expires_in: 900, // 15 minutos en segundos
    };
  }

  /**
   * Verificar código OTP
   */
  async verifyCode(dto: VerifyCodeDto) {
    const { email, code } = dto;
    const normalizedEmail = email.toLowerCase().trim();

    // Buscar verificación por email y código
    const verification = await this.prisma.emailVerification.findFirst({
      where: {
        email: normalizedEmail,
        code,
        verified: false,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!verification) {
      throw new BadRequestException('Código inválido o expirado');
    }

    if (new Date() > verification.expires_at) {
      throw new BadRequestException('El código ha expirado. Solicita uno nuevo.');
    }

    // Marcar como verificado
    await this.prisma.emailVerification.update({
      where: { id: verification.id },
      data: { verified: true },
    });

    // Generar token temporal para el registro (válido por 30 minutos)
    const registrationToken = randomUUID();
    const registrationExpires = new Date();
    registrationExpires.setMinutes(registrationExpires.getMinutes() + 30);

    // Guardar token de registro
    await this.prisma.emailVerification.create({
      data: {
        email: normalizedEmail,
        token: registrationToken,
        code: null,
        expires_at: registrationExpires,
        verified: true, // Ya verificado, es token de registro
      },
    });

    return {
      message: 'Email verificado correctamente',
      email: normalizedEmail,
      registration_token: registrationToken,
      expires_in: 1800, // 30 minutos en segundos
    };
  }

  /**
   * Validar token de registro (para usar en el registro de empresa)
   */
  async validateRegistrationToken(email: string, token: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();

    const verification = await this.prisma.emailVerification.findFirst({
      where: {
        email: normalizedEmail,
        token,
        verified: true,
        code: null, // Token de registro no tiene código
      },
    });

    if (!verification) {
      return false;
    }

    if (new Date() > verification.expires_at) {
      return false;
    }

    return true;
  }

  /**
   * Obtener datos del usuario autenticado con permisos actualizados
   */
  async getMe(jwtPayload: {
    sub: string;
    email: string;
    user_type: string;
    company_id?: string;
    role?: string;
  }) {
    // Para system_admin, devolver datos básicos
    if (jwtPayload.user_type === 'system_admin') {
      const user = await this.prisma.user.findUnique({
        where: { id: jwtPayload.sub },
        select: { id: true, email: true, full_name: true },
      });

      return {
        user_type: 'system_admin',
        user,
        role: 'super_admin',
      };
    }

    // Para company_user, obtener permisos actualizados del tenant
    if (!jwtPayload.company_id) {
      return { error: 'No company_id in token' };
    }

    const company = await this.prisma.company.findUnique({
      where: { id: jwtPayload.company_id },
    });

    if (!company || !company.is_active) {
      return { error: 'Company not found or inactive' };
    }

    const tenantPrisma = new TenantPrismaClient({
      datasources: {
        db: { url: this.buildDatabaseUrl(company) },
      },
    });

    try {
      const tenantUser = await tenantPrisma.tenantUser.findUnique({
        where: { id: jwtPayload.sub },
        include: { role: true },
      });

      if (!tenantUser || !tenantUser.is_active) {
        return { error: 'User not found or inactive' };
      }

      // Obtener suscripción con módulos y acciones
      const subscription = await this.prisma.subscription.findFirst({
        where: {
          company_id: company.id,
          OR: [{ ends_at: null }, { ends_at: { gte: new Date() } }],
        },
        include: {
          plan: {
            include: {
              plan_modules: {
                include: {
                  module: {
                    include: { actions: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!subscription) {
        return { error: 'No active subscription' };
      }

      // Resolver permisos actualizados
      const resolvedActions = await this.resolveUserPermissions(
        tenantPrisma,
        tenantUser,
        subscription.plan.plan_modules,
      );

      // Módulos visibles
      const isPrivileged = tenantUser.role?.role_key === 'owner' || tenantUser.role?.role_key === 'admin';
      const visibleModules = isPrivileged
        ? this.getEnabledModules(subscription.plan.plan_modules)
        : this.getVisibleModules(subscription.plan.plan_modules, resolvedActions);

      return {
        user_type: 'company_user',
        user: {
          id: tenantUser.id,
          email: tenantUser.email,
          full_name: tenantUser.full_name,
        },
        company: {
          id: company.id,
          name: company.company_name,
          nit: company.nit,
          logo_url: company.logo_url,
        },
        permissions: {
          modules: visibleModules,
          actions: resolvedActions,
        },
        role: tenantUser.role?.role_key,
      };
    } finally {
      await tenantPrisma.$disconnect();
    }
  }
}
