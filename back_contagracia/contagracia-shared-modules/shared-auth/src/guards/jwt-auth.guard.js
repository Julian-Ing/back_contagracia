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
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
/**
 * Guard de autenticación JWT con validaciones de seguridad
 *
 * Valida:
 * 1. Token JWT válido y no expirado
 * 2. Sesión no revocada (kill-switch individual)
 * 3. Sesión no afectada por kill-switch global del usuario
 * 4. Actualiza last_activity cada 5 minutos (throttled)
 */
let JwtAuthGuard = class JwtAuthGuard {
    constructor(jwtService, redisService, prismaService) {
        this.jwtService = jwtService;
        this.redisService = redisService;
        this.prismaService = prismaService;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);
        if (!token) {
            throw new common_1.UnauthorizedException('Token no encontrado');
        }
        let payload;
        try {
            payload = await this.jwtService.verifyAsync(token, {
                secret: process.env.JWT_SECRET,
            });
        }
        catch (error) {
            throw new common_1.UnauthorizedException('Token inválido o expirado');
        }
        // Validar que el payload tenga los campos requeridos
        if (!payload.sub || !payload.session_id) {
            throw new common_1.UnauthorizedException('Token inválido: falta información de sesión');
        }
        // === VALIDACIONES DE KILL-SWITCH (si Redis está disponible) ===
        if (this.redisService) {
            // 1. Verificar si sesión específica fue revocada
            const isSessionRevoked = await this.redisService.isSessionRevoked(payload.session_id);
            if (isSessionRevoked) {
                throw new common_1.UnauthorizedException('Sesión revocada');
            }
            // 2. Verificar si todas las sesiones del usuario fueron eliminadas
            const sessionCreatedAt = new Date(payload.iat * 1000); // iat viene en segundos
            const allSessionsKilled = await this.redisService.areAllUserSessionsKilled(payload.sub, sessionCreatedAt);
            if (allSessionsKilled) {
                throw new common_1.UnauthorizedException('Todas las sesiones fueron revocadas. Por favor, inicia sesión nuevamente');
            }
        }
        // === ACTUALIZAR ACTIVIDAD (si Prisma está disponible, throttled a cada 5 min) ===
        if (this.prismaService && this.shouldUpdateActivity(payload)) {
            this.updateLastActivity(payload.session_id).catch((err) => {
                // No bloquear el request si falla la actualización
                console.warn('Failed to update last_activity:', err.message);
            });
        }
        // Agregar payload al request para usarlo en controllers
        request.user = payload;
        return true;
    }
    extractTokenFromHeader(request) {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
    /**
     * Determinar si se debe actualizar last_activity (throttle: cada 5 min)
     */
    shouldUpdateActivity(payload) {
        // Solo actualizar si el token tiene más de 5 minutos
        const tokenAge = Date.now() - payload.iat * 1000;
        const FIVE_MINUTES = 5 * 60 * 1000;
        return tokenAge > FIVE_MINUTES;
    }
    /**
     * Actualizar last_activity de la sesión (async, no bloquea el request)
     */
    async updateLastActivity(sessionId) {
        if (!this.prismaService)
            return;
        try {
            await this.prismaService.session.update({
                where: { session_id: sessionId },
                data: { last_activity: new Date() },
            });
        }
        catch (error) {
            // Si la sesión no existe, ignorar
            if (error.code !== 'P2025') {
                throw error;
            }
        }
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Optional)()),
    __param(1, (0, common_1.Inject)('REDIS_SERVICE')),
    __param(2, (0, common_1.Optional)()),
    __param(2, (0, common_1.Inject)('PRISMA_SERVICE')),
    __metadata("design:paramtypes", [jwt_1.JwtService, Object, Object])
], JwtAuthGuard);
