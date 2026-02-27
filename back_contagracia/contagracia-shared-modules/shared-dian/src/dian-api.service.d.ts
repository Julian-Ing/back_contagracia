import type { PrismaClient } from '@prisma/client-tenant';
import type { TenantContextService } from '../../shared-tenant-context/src/tenant-context.service';
export interface SyncCompanyData {
    nit: string;
    dv: string;
    company_name: string;
    address: string;
    phone: string;
    email: string;
    type_document_identification_code: string;
    type_organization_code: string;
    type_regime_code: string;
    type_liability_code: string;
    municipality_code: string;
    department_code: string;
}
export interface SyncCompanyResponse {
    success: boolean;
    message?: string;
    token?: string;
}
export interface UploadCertificateData {
    certificate: string;
    password: string;
    nit: string;
    token: string;
}
export interface UploadCertificateResponse {
    success: boolean;
    message?: string;
    expires_at?: string;
    errors?: Record<string, any>;
}
/**
 * Servicio para comunicación con la API DIAN (Contagracia API)
 *
 * Variables de entorno:
 *   DIAN_API_URL - URL base del API (ej: https://api.contagracia.com)
 *   DIAN_API_TOKEN_RUT - Token solo para consulta de RUT
 */
export declare class DianApiService {
    private readonly logger;
    constructor();
    private get apiUrl();
    private get rutToken();
    /**
     * Método helper para hacer requests a la API DIAN
     */
    private makeRequest;
    /**
     * Campos grandes de la respuesta DIAN (XMLs en base64) que se excluyen del api_log
     */
    private static readonly EXCLUDED_RESPONSE_FIELDS;
    /**
     * Filtra campos grandes de un objeto de respuesta DIAN
     */
    private filterLargeFields;
    /**
     * Guarda un registro en api_log del tenant
     */
    saveApiLog(tenantDb: PrismaClient, referenceType: string, request: Record<string, any>, response: Record<string, any> | null, success: boolean, referenceId?: string | null, urlPdf?: string | null): Promise<void>;
    /**
     * Consultar RUT en la DIAN por número de identificación
     */
    queryRut(identificationNumber: string): Promise<{
        success: boolean;
        message: string;
        data?: {
            business_name?: string;
            email?: string;
            address?: string;
            phone?: string;
        };
    }>;
    /**
     * Sincronizar empresa con API DIAN
     * - Primera vez: API devuelve token → se guarda en CompanySetting
     * - Siguientes veces: usa el token guardado como Bearer
     */
    syncCompany(companyId: string, data: SyncCompanyData, tenantContext: TenantContextService): Promise<SyncCompanyResponse>;
    /**
     * Enviar certificado .p12 (base64) al API DIAN
     * PUT /api/ubl2.1/config/certificate
     */
    uploadCertificate(companyId: string, data: UploadCertificateData): Promise<UploadCertificateResponse>;
    /**
     * Obtener el token DIAN guardado en CompanySetting
     */
    getDianToken(companyId: string, tenantContext: TenantContextService): Promise<string | null>;
    /**
     * Enviar resolución a la API DIAN
     * PUT /api/ubl2.1/config/resolution
     */
    syncResolution(token: string, resolutionData: {
        type_document_id: number;
        prefix: string;
        resolution: string;
        resolution_date: string;
        technical_key: string;
        from: number;
        to: number;
        date_from: string;
        date_to: string;
    }): Promise<{
        success: boolean;
        message?: string;
    }>;
    /**
     * Configurar software de facturación
     * PUT /api/ubl2.1/config/software
     */
    configSoftwareInvoice(companyId: string, token: string, softwareId: string, softwarePin: number): Promise<{
        success: boolean;
        message?: string;
    }>;
    /**
     * Configurar software de nómina
     * PUT /api/ubl2.1/config/softwarepayroll
     */
    configSoftwarePayroll(companyId: string, token: string, payrollId: string, payrollPin: number): Promise<{
        success: boolean;
        message?: string;
    }>;
    /**
     * Cambiar ambiente de facturación
     * PUT /api/ubl2.1/config/environment
     */
    changeInvoiceEnvironment(companyId: string, token: string, invoiceEnvironment: number, payrollEnvironment: number): Promise<{
        success: boolean;
        message?: string;
    }>;
    /**
     * Cambiar ambiente de nómina
     * PUT /api/ubl2.1/config/environment
     */
    changePayrollEnvironment(companyId: string, token: string, invoiceEnvironment: number, payrollEnvironment: number): Promise<{
        success: boolean;
        message?: string;
    }>;
    /**
     * Consultar rangos de numeración activos en DIAN
     * POST /api/ubl2.1/numbering-range
     */
    getNumberingRange(token: string, softwareId: string): Promise<{
        success: boolean;
        message?: string;
        resolutions?: any[];
        data?: any;
    }>;
    /**
     * Enviar factura de prueba al API DIAN
     * POST /api/ubl2.1/invoice/{testSetId}
     */
    sendInvoice(token: string, testSetId: string, invoiceData: Record<string, any>): Promise<{
        success: boolean;
        message?: string;
        zipKey?: string;
        data?: any;
    }>;
    /**
     * Consultar estado de un ZipKey
     * POST /api/ubl2.1/status/zip/{zipKey}
     */
    checkZipStatus(token: string, zipKey: string): Promise<{
        success: boolean;
        message?: string;
        statusCode?: string;
        statusDescription?: string;
        data?: any;
    }>;
    /**
     * Enviar nómina de prueba al API DIAN
     * POST /api/ubl2.1/payroll/{testSetId}
     */
    sendPayroll(token: string, testSetId: string, payrollData: Record<string, any>): Promise<{
        success: boolean;
        message?: string;
        cune?: string;
        data?: any;
    }>;
    /**
     * Enviar nota de ajuste de nómina al API DIAN
     * POST /api/ubl2.1/payroll-adjust-note/{testSetId}
     */
    sendPayrollAdjustNote(token: string, testSetId: string, noteData: Record<string, any>): Promise<{
        success: boolean;
        message?: string;
        cune?: string;
        data?: any;
    }>;
}
