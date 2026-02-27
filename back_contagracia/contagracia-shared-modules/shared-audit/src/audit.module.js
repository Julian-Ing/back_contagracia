"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AuditModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditModule = void 0;
const common_1 = require("@nestjs/common");
const audit_logging_interceptor_1 = require("./interceptors/audit-logging.interceptor");
// Resolve APP_INTERCEPTOR and Reflector from the host service's @nestjs/core
// to avoid pnpm dual-package issues between workspaces
function getCoreTokens() {
    // Walk up from the calling service's node_modules to find @nestjs/core
    // This ensures we get the same instance NestJS uses internally
    const core = require(require.resolve('@nestjs/core', {
        paths: [process.cwd()],
    }));
    return {
        APP_INTERCEPTOR: core.APP_INTERCEPTOR,
        Reflector: core.Reflector,
    };
}
let AuditModule = AuditModule_1 = class AuditModule {
    static forRoot(config) {
        const { APP_INTERCEPTOR, Reflector } = getCoreTokens();
        return {
            module: AuditModule_1,
            providers: [
                {
                    provide: 'AUDIT_REFLECTOR',
                    useFactory: () => new Reflector(),
                },
                {
                    provide: 'AUDIT_CONFIG',
                    useValue: config,
                },
                audit_logging_interceptor_1.AuditLoggingInterceptor,
                {
                    provide: APP_INTERCEPTOR,
                    useExisting: audit_logging_interceptor_1.AuditLoggingInterceptor,
                },
            ],
            exports: [audit_logging_interceptor_1.AuditLoggingInterceptor],
        };
    }
};
exports.AuditModule = AuditModule;
exports.AuditModule = AuditModule = AuditModule_1 = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({})
], AuditModule);
