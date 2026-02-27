"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditContextInterceptor = void 0;
const common_1 = require("@nestjs/common");
/**
 * Interceptor que captura y agrega información de auditoría al request
 * - IP address del cliente
 * - User agent (browser/device)
 * - Session ID (si está disponible en el JWT)
 *
 * Los datos quedan disponibles en request.auditContext para ser usados
 * por el servicio de auditoría
 */
let AuditContextInterceptor = class AuditContextInterceptor {
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        // Capturar IP address (considerar proxies)
        const ipAddress = request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            request.headers['x-real-ip'] ||
            request.connection?.remoteAddress ||
            request.socket?.remoteAddress ||
            request.ip ||
            'unknown';
        // Capturar User Agent
        const userAgent = request.headers['user-agent'] || 'unknown';
        // Extraer session ID del JWT si está disponible
        const sessionId = request.user?.session_id || null;
        // Extraer user ID si está disponible
        const userId = request.user?.sub || null;
        // Agregar al request para que esté disponible en servicios
        request.auditContext = {
            ipAddress,
            userAgent,
            sessionId,
            userId,
            timestamp: new Date(),
        };
        return next.handle();
    }
};
exports.AuditContextInterceptor = AuditContextInterceptor;
exports.AuditContextInterceptor = AuditContextInterceptor = __decorate([
    (0, common_1.Injectable)()
], AuditContextInterceptor);
