import { DynamicModule } from '@nestjs/common';
export interface AuditModuleConfig {
    serviceName: string;
}
export declare class AuditModule {
    static forRoot(config: AuditModuleConfig): DynamicModule;
}
