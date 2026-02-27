import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Optional,
  Logger,
} from '@nestjs/common';
import { Observable, tap, catchError, from, switchMap } from 'rxjs';
import { AUDIT_KEY } from '../decorators/audit.decorator';
import { NO_AUDIT_KEY } from '../decorators/no-audit.decorator';

const SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'refresh_token',
  'access_token',
  'current_password',
  'new_password',
  'confirm_password',
  'authorization',
];

const MAX_RESPONSE_SIZE = 10000;

@Injectable()
export class AuditLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLoggingInterceptor.name);
  // Cache de NIT → company_id para evitar queries repetidos
  private nitToCompanyCache = new Map<string, string>();

  constructor(
    @Inject('AUDIT_REFLECTOR') private readonly reflector: any,
    @Inject('AUDIT_CONFIG') private readonly config: { serviceName: string },
    @Optional() @Inject('TENANT_PRISMA_SERVICE') private readonly tenantPrisma?: any,
    @Optional() @Inject('MASTER_PRISMA_SERVICE') private readonly masterPrisma?: any,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Verificar @NoAudit()
    const noAudit = this.reflector.get(NO_AUDIT_KEY, context.getHandler());
    if (noAudit) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    // Leer metadata de @Audit() si existe
    const auditMeta = this.reflector.get(AUDIT_KEY, context.getHandler());
    const actionKey = auditMeta?.actionKey || `${request.method} ${request.route?.path || request.url}`;
    const entityType = auditMeta?.entityType || null;

    // Extraer entity_id de los parámetros de ruta (:id, :employeeId, etc.)
    const entityId = request.params?.id || request.params?.employeeId || request.params?.contractId || null;

    // Extraer contexto del request
    const ipAddress =
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip ||
      'unknown';

    const userAgent = request.headers['user-agent'] || 'unknown';
    const userId = request.user?.sub || null;
    const email = request.user?.email || request.body?.email || null;
    const companyIdFromJwt = request.user?.company_id || null;
    const sessionId = request.user?.session_id || null;
    const nitFromBody = request.body?.nit;

    // Resolver company_id: del JWT o buscando por NIT
    const resolveCompanyId = async (): Promise<string | null> => {
      if (companyIdFromJwt) return companyIdFromJwt;
      if (nitFromBody && this.masterPrisma) {
        return this.getCompanyIdByNit(nitFromBody);
      }
      return null;
    };

    // Usar observable para manejar la operación async
    return from(resolveCompanyId()).pipe(
      switchMap((companyId) => {
        // Sin company_id no se puede persistir en tenant → skip audit pero continuar request
        if (!companyId) {
          return next.handle();
        }

        const requestBody = this.sanitize(request.body);

        const baseData = {
          user_id: userId,
          email,
          session_id: sessionId,
          company_id: companyId,
          action_key: actionKey,
          entity_type: entityType,
          entity_id: entityId,
          service_name: this.config.serviceName,
          method: request.method,
          url: request.originalUrl || request.url,
          request_body: requestBody,
          ip_address: ipAddress,
          user_agent: userAgent,
        };

        return next.handle().pipe(
          tap((responseBody) => {
            // Fire-and-forget: ejecutar persist sin bloquear la respuesta
            this.persist({
              ...baseData,
              status_code: response.statusCode || 200,
              duration_ms: Date.now() - startTime,
              response_body: this.truncateResponse(responseBody),
            }, companyId).catch((err) => {
              this.logger.warn(`Error en persist (success): ${err.message}`);
            });
          }),
          catchError((error) => {
            // Fire-and-forget: ejecutar persist sin bloquear el error
            this.persist({
              ...baseData,
              status_code: error.status || error.statusCode || 500,
              duration_ms: Date.now() - startTime,
              error_message: error.message || 'Unknown error',
            }, companyId).catch((err) => {
              this.logger.warn(`Error en persist (error): ${err.message}`);
            });
            throw error;
          }),
        );
      }),
    );
  }

  private async persist(data: Record<string, any>, companyId: string): Promise<void> {
    try {
      if (this.tenantPrisma) {
        // Soportar tanto TenantPrismaService (getClientForCompany) como TenantContextService (getTenantClient)
        const client = this.tenantPrisma.getClientForCompany
          ? await this.tenantPrisma.getClientForCompany(companyId)
          : await this.tenantPrisma.getTenantClient(companyId);

        if (client) {
          await client.auditLog.create({ data });
        }
      }
    } catch (error) {
      this.logger.warn(
        `Error al persistir audit log: ${error.message}`,
        { action_key: data.action_key, company_id: companyId },
      );
    }
  }

  private sanitize(body: any): any {
    if (!body || typeof body !== 'object') return body || null;
    const sanitized = Array.isArray(body) ? [...body] : { ...body };
    if (!Array.isArray(sanitized)) {
      for (const key of Object.keys(sanitized)) {
        if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
          sanitized[key] = this.sanitize(sanitized[key]);
        }
      }
    }
    return sanitized;
  }

  private truncateResponse(body: any): any {
    if (!body) return null;
    try {
      const str = JSON.stringify(body);
      if (str.length > MAX_RESPONSE_SIZE) {
        return { _truncated: true, _size: str.length };
      }
      return body;
    } catch {
      return { _error: 'No serializable' };
    }
  }

  /**
   * Buscar company_id por NIT en la base de datos master
   * Usa cache para evitar queries repetidos
   */
  private async getCompanyIdByNit(nit: string): Promise<string | null> {
    try {
      // Verificar cache primero
      if (this.nitToCompanyCache.has(nit)) {
        return this.nitToCompanyCache.get(nit) || null;
      }

      // Buscar en master DB
      const company = await this.masterPrisma.company.findUnique({
        where: { nit },
        select: { id: true },
      });

      if (company?.id) {
        // Guardar en cache (máx 1000 entries para evitar memory leak)
        if (this.nitToCompanyCache.size > 1000) {
          this.nitToCompanyCache.clear();
        }
        this.nitToCompanyCache.set(nit, company.id);
        return company.id;
      }

      return null;
    } catch (error) {
      this.logger.warn(`Error buscando company por NIT: ${error.message}`);
      return null;
    }
  }
}
