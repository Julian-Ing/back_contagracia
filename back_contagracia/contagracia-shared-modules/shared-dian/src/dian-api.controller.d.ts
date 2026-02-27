import { DianApiService } from './dian-api.service';
export declare class DianApiController {
    private readonly dianApiService;
    constructor(dianApiService: DianApiService);
    queryRut(body: {
        identification_number: string;
    }): Promise<{
        success: boolean;
        message: string;
        data?: {
            business_name?: string;
            email?: string;
            address?: string;
            phone?: string;
        };
    }>;
}
