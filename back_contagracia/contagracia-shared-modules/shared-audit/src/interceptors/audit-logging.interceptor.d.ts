import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
export declare class AuditLoggingInterceptor implements NestInterceptor {
    private readonly reflector;
    private readonly config;
    private readonly tenantPrisma?;
    private readonly logger;
    constructor(reflector: any, config: {
        serviceName: string;
    }, tenantPrisma?: any);
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
    private persist;
    private sanitize;
    private truncateResponse;
}
