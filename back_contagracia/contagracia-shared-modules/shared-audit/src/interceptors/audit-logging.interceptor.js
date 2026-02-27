"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuditLoggingInterceptor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLoggingInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const audit_decorator_1 = require("../decorators/audit.decorator");
const no_audit_decorator_1 = require("../decorators/no-audit.decorator");
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
let AuditLoggingInterceptor = AuditLoggingInterceptor_1 = class AuditLoggingInterceptor {
    constructor(reflector, config, tenantPrisma) {
        this.reflector = reflector;
        this.config = config;
        this.tenantPrisma = tenantPrisma;
        this.logger = new common_1.Logger(AuditLoggingInterceptor_1.name);
    }
    intercept(context, next) {
        // Verificar @NoAudit()
        const noAudit = this.reflector.get(no_audit_decorator_1.NO_AUDIT_KEY, context.getHandler());
        if (noAudit) {
            return next.handle();
        }
        const request = context.switchToHttp().getRequest();
        const startTime = Date.now();
        // Leer metadata de @Audit() si existe
        const auditMeta = this.reflector.get(audit_decorator_1.AUDIT_KEY, context.getHandler());
        const actionKey = auditMeta?.actionKey || `${request.method} ${request.route?.path || request.url}`;
        const entityType = auditMeta?.entityType || null;
        // Extraer contexto del request
        const ipAddress = request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            request.headers['x-real-ip'] ||
            request.connection?.remoteAddress ||
            request.socket?.remoteAddress ||
            request.ip ||
            'unknown';
        const userAgent = request.headers['user-agent'] || 'unknown';
        const userId = request.user?.sub || null;
        const email = request.user?.email || null;
        const companyId = request.user?.company_id || null;
        const sessionId = request.user?.session_id || null;
        // Sin company_id no se puede persistir en tenant → skip
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
            service_name: this.config.serviceName,
            method: request.method,
            url: request.originalUrl || request.url,
            request_body: requestBody,
            ip_address: ipAddress,
            user_agent: userAgent,
        };
        return next.handle().pipe((0, rxjs_1.tap)(async (responseBody) => {
            await this.persist({
                ...baseData,
                status_code: request.res?.statusCode || 200,
                duration_ms: Date.now() - startTime,
                response_body: this.truncateResponse(responseBody),
            }, companyId);
        }), (0, rxjs_1.catchError)(async (error) => {
            await this.persist({
                ...baseData,
                status_code: error.status || error.statusCode || 500,
                duration_ms: Date.now() - startTime,
                error_message: error.message || 'Unknown error',
            }, companyId);
            throw error;
        }));
    }
    async persist(data, companyId) {
        try {
            if (this.tenantPrisma) {
                const client = await this.tenantPrisma.getClientForCompany(companyId);
                await client.auditLog.create({ data });
            }
        }
        catch (error) {
            this.logger.warn(`Error al persistir audit log: ${error.message}`, { action_key: data.action_key, company_id: companyId });
        }
    }
    sanitize(body) {
        if (!body || typeof body !== 'object')
            return body || null;
        const sanitized = Array.isArray(body) ? [...body] : { ...body };
        if (!Array.isArray(sanitized)) {
            for (const key of Object.keys(sanitized)) {
                if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
                    sanitized[key] = '[REDACTED]';
                }
                else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
                    sanitized[key] = this.sanitize(sanitized[key]);
                }
            }
        }
        return sanitized;
    }
    truncateResponse(body) {
        if (!body)
            return null;
        try {
            const str = JSON.stringify(body);
            if (str.length > MAX_RESPONSE_SIZE) {
                return { _truncated: true, _size: str.length };
            }
            return body;
        }
        catch {
            return { _error: 'No serializable' };
        }
    }
};
exports.AuditLoggingInterceptor = AuditLoggingInterceptor;
exports.AuditLoggingInterceptor = AuditLoggingInterceptor = AuditLoggingInterceptor_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('AUDIT_REFLECTOR')),
    __param(1, (0, common_1.Inject)('AUDIT_CONFIG')),
    __param(2, (0, common_1.Optional)()),
    __param(2, (0, common_1.Inject)('TENANT_PRISMA_SERVICE')),
    __metadata("design:paramtypes", [Object, Object, Object])
], AuditLoggingInterceptor);
