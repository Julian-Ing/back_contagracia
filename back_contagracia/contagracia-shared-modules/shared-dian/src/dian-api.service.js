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
var DianApiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DianApiService = void 0;
const common_1 = require("@nestjs/common");
/**
 * Servicio para comunicación con la API DIAN (Contagracia API)
 *
 * Variables de entorno:
 *   DIAN_API_URL - URL base del API (ej: https://api.contagracia.com)
 *   DIAN_API_TOKEN_RUT - Token solo para consulta de RUT
 */
let DianApiService = DianApiService_1 = class DianApiService {
    constructor() {
        this.logger = new common_1.Logger(DianApiService_1.name);
    }
    get apiUrl() {
        return process.env.DIAN_API_URL;
    }
    get rutToken() {
        return process.env.DIAN_API_TOKEN_RUT || '';
    }
    /**
     * Método helper para hacer requests a la API DIAN
     */
    async makeRequest(endpoint, method, body, token) {
        const url = `${this.apiUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        };
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
        this.logger.log(`📤 ${method} ${endpoint}${body ? ': ' + JSON.stringify(body) : ''}`);
        try {
            const response = await fetch(url, {
                method,
                headers,
                ...(body && { body: JSON.stringify(body) }),
            });
            const responseData = await response.json();
            this.logger.log(`📥 ${method} ${endpoint} (${response.status}): ${JSON.stringify(responseData)}`);
            if (!response.ok) {
                return {
                    success: false,
                    message: responseData.message || `Error ${response.status}: ${response.statusText}`,
                    status: response.status,
                };
            }
            return {
                success: responseData.success !== false,
                data: responseData,
                message: responseData.message,
                status: response.status,
            };
        }
        catch (error) {
            this.logger.error(`❌ ${method} ${endpoint}: ${error.message}`);
            return {
                success: false,
                message: error.message,
            };
        }
    }
    /**
     * Filtra campos grandes de un objeto de respuesta DIAN
     */
    filterLargeFields(data) {
        const filtered = {};
        for (const [key, value] of Object.entries(data)) {
            if (DianApiService_1.EXCLUDED_RESPONSE_FIELDS.includes(key.toLowerCase())) {
                filtered[key] = `[EXCLUDED - ${String(value).length} chars]`;
            }
            else {
                filtered[key] = value;
            }
        }
        return filtered;
    }
    /**
     * Guarda un registro en api_log del tenant
     */
    async saveApiLog(tenantDb, referenceType, request, response, success, referenceId, urlPdf) {
        try {
            const filteredResponse = response ? this.filterLargeFields(response) : null;
            await tenantDb.apiLog.create({
                data: {
                    reference_id: referenceId || null,
                    reference_type: referenceType,
                    json_request: request,
                    json_response: filteredResponse,
                    status_response: success,
                    url_pdf: urlPdf || null,
                },
            });
        }
        catch (error) {
            this.logger.error(`Error guardando api_log: ${error.message}`);
        }
    }
    /**
     * Consultar RUT en la DIAN por número de identificación
     */
    async queryRut(identificationNumber) {
        const url = `${this.apiUrl}/api/ubl2.1/query_rut`;
        this.logger.log(`Consultando RUT para NIT: ${identificationNumber}`);
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: `Bearer ${this.rutToken}`,
            },
            body: JSON.stringify({ identification_number: Number(identificationNumber) }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            this.logger.error(`Error API DIAN (${response.status}): ${errorText}`);
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return response.json();
    }
    /**
     * Sincronizar empresa con API DIAN
     * - Primera vez: API devuelve token → se guarda en CompanySetting
     * - Siguientes veces: usa el token guardado como Bearer
     */
    async syncCompany(companyId, data, tenantContext) {
        const tenantDb = await tenantContext.getTenantClient(companyId);
        if (!tenantDb) {
            this.logger.error(`No se pudo obtener tenant DB para company ${companyId}`);
            return { success: false, message: 'No se pudo acceder a la base de datos del tenant' };
        }
        // Armar payload
        const body = {
            type_document_identification_id: Number(data.type_document_identification_code),
            type_organization_id: Number(data.type_organization_code),
            type_regime_id: Number(data.type_regime_code),
            type_liability_id: Number(data.type_liability_code),
            business_name: data.company_name.trim(),
            merchant_registration: '0000',
            municipality_id: Number(data.municipality_code),
            department_id: Number(data.department_code),
            address: data.address.trim(),
            phone: data.phone.trim(),
            email: data.email.trim(),
            nit: data.nit.trim(),
            dv: data.dv,
        };
        const url = `${this.apiUrl}/api/ubl2.1/config/${data.nit}/${data.dv}`;
        this.logger.log(`Sincronizando empresa ${data.nit} con API DIAN`);
        this.logger.log(`Payload enviado a API DIAN: ${JSON.stringify(body, null, 2)}`);
        try {
            // POST de empresa siempre va sin token — el API detecta si crear o actualizar
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error(`Error API DIAN syncCompany (${response.status}): ${errorText}`);
                return { success: false, message: `Error ${response.status}: ${response.statusText}` };
            }
            const apiResponse = await response.json();
            // El API siempre devuelve el token → guardar/actualizar en CompanySetting
            if (apiResponse.token) {
                await tenantDb.companySetting.update({
                    where: { category_key: { category: 'dian', key: 'api_dian_token' } },
                    data: { value: apiResponse.token },
                });
                this.logger.log(`Token DIAN guardado para empresa ${data.nit}`);
            }
            return { success: true, token: apiResponse.token };
        }
        catch (error) {
            this.logger.error(`Error sincronizando empresa con DIAN: ${error.message}`);
            return { success: false, message: error.message };
        }
    }
    /**
     * Enviar certificado .p12 (base64) al API DIAN
     * PUT /api/ubl2.1/config/certificate
     */
    async uploadCertificate(companyId, data) {
        const url = `${this.apiUrl}/api/ubl2.1/config/certificate`;
        this.logger.log(`Enviando certificado al API DIAN para NIT: ${data.nit}`);
        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${data.token}`,
                },
                body: JSON.stringify({
                    certificate: data.certificate,
                    password: data.password,
                    nit: Number(data.nit),
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error(`Error API DIAN certificate (${response.status}): ${errorText}`);
                // Intentar parsear el error como JSON
                try {
                    const errorData = JSON.parse(errorText);
                    return {
                        success: false,
                        message: errorData.message || `Error ${response.status}: ${response.statusText}`,
                        errors: errorData.errors,
                    };
                }
                catch {
                    // Si no es JSON válido, devolver mensaje genérico
                    return { success: false, message: `Error ${response.status}: ${response.statusText}` };
                }
            }
            const apiResponse = await response.json();
            return {
                success: apiResponse.success !== false,
                message: apiResponse.message || 'Certificado cargado',
                expires_at: apiResponse.certificado?.expiration_date,
            };
        }
        catch (error) {
            this.logger.error(`Error enviando certificado a DIAN: ${error.message}`);
            return { success: false, message: error.message };
        }
    }
    /**
     * Obtener el token DIAN guardado en CompanySetting
     */
    async getDianToken(companyId, tenantContext) {
        const tenantDb = await tenantContext.getTenantClient(companyId);
        if (!tenantDb)
            return null;
        const setting = await tenantDb.companySetting.findFirst({
            where: { category: 'dian', key: 'api_dian_token' },
        });
        return setting?.value || null;
    }
    /**
     * Enviar resolución a la API DIAN
     * PUT /api/ubl2.1/config/resolution
     */
    async syncResolution(token, resolutionData) {
        const body = {
            ...resolutionData,
            generated_to_date: 0,
        };
        const result = await this.makeRequest('/api/ubl2.1/config/resolution', 'PUT', body, token);
        return {
            success: result.success,
            message: result.message,
        };
    }
    /**
     * Configurar software de facturación
     * PUT /api/ubl2.1/config/software
     */
    async configSoftwareInvoice(companyId, token, softwareId, softwarePin) {
        const url = `${this.apiUrl}/api/ubl2.1/config/software`;
        this.logger.log(`Configurando software de facturación para empresa ${companyId}`);
        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    id: softwareId,
                    pin: softwarePin,
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error(`Error API DIAN software invoice (${response.status}): ${errorText}`);
                return { success: false, message: `Error ${response.status}: ${response.statusText}` };
            }
            const apiResponse = await response.json();
            return {
                success: apiResponse.success !== false,
                message: apiResponse.message || 'Software configurado',
            };
        }
        catch (error) {
            this.logger.error(`Error configurando software de facturación: ${error.message}`);
            return { success: false, message: error.message };
        }
    }
    /**
     * Configurar software de nómina
     * PUT /api/ubl2.1/config/softwarepayroll
     */
    async configSoftwarePayroll(companyId, token, payrollId, payrollPin) {
        const url = `${this.apiUrl}/api/ubl2.1/config/softwarepayroll`;
        this.logger.log(`Configurando software de nómina para empresa ${companyId}`);
        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    idpayroll: payrollId,
                    pinpayroll: payrollPin,
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error(`Error API DIAN software payroll (${response.status}): ${errorText}`);
                return { success: false, message: `Error ${response.status}: ${response.statusText}` };
            }
            const apiResponse = await response.json();
            return {
                success: apiResponse.success !== false,
                message: apiResponse.message || 'Software de nómina configurado',
            };
        }
        catch (error) {
            this.logger.error(`Error configurando software de nómina: ${error.message}`);
            return { success: false, message: error.message };
        }
    }
    /**
     * Cambiar ambiente de facturación
     * PUT /api/ubl2.1/config/environment
     */
    async changeInvoiceEnvironment(companyId, token, invoiceEnvironment, payrollEnvironment) {
        const url = `${this.apiUrl}/api/ubl2.1/config/environment`;
        this.logger.log(`Cambiando ambiente de facturación a ${invoiceEnvironment} para empresa ${companyId}`);
        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    type_environment_id: invoiceEnvironment,
                    payroll_type_environment_id: payrollEnvironment,
                    eqdocs_type_environment_id: 2,
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error(`Error API DIAN environment (${response.status}): ${errorText}`);
                return { success: false, message: `Error ${response.status}: ${response.statusText}` };
            }
            const apiResponse = await response.json();
            return {
                success: apiResponse.success !== false,
                message: apiResponse.message || 'Ambiente actualizado',
            };
        }
        catch (error) {
            this.logger.error(`Error cambiando ambiente de facturación: ${error.message}`);
            return { success: false, message: error.message };
        }
    }
    /**
     * Cambiar ambiente de nómina
     * PUT /api/ubl2.1/config/environment
     */
    async changePayrollEnvironment(companyId, token, invoiceEnvironment, payrollEnvironment) {
        const url = `${this.apiUrl}/api/ubl2.1/config/environment`;
        this.logger.log(`Cambiando ambiente de nómina a ${payrollEnvironment} para empresa ${companyId}`);
        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    type_environment_id: invoiceEnvironment,
                    payroll_type_environment_id: payrollEnvironment,
                    eqdocs_type_environment_id: 2,
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error(`Error API DIAN environment (${response.status}): ${errorText}`);
                return { success: false, message: `Error ${response.status}: ${response.statusText}` };
            }
            const apiResponse = await response.json();
            return {
                success: apiResponse.success !== false,
                message: apiResponse.message || 'Ambiente actualizado',
            };
        }
        catch (error) {
            this.logger.error(`Error cambiando ambiente de nómina: ${error.message}`);
            return { success: false, message: error.message };
        }
    }
    /**
     * Consultar rangos de numeración activos en DIAN
     * POST /api/ubl2.1/numbering-range
     */
    async getNumberingRange(token, softwareId) {
        const result = await this.makeRequest('/api/ubl2.1/numbering-range', 'POST', { IDSoftware: softwareId }, token);
        if (!result.success) {
            return { success: false, message: result.message };
        }
        const rangeResult = result.data?.ResponseDian?.Envelope?.Body
            ?.GetNumberingRangeResponse?.GetNumberingRangeResult;
        const opCode = rangeResult?.OperationCode;
        const opDesc = rangeResult?.OperationDescription;
        if (opCode !== '100') {
            return { success: false, message: opDesc || `OperationCode: ${opCode}`, data: result.data };
        }
        let list = rangeResult?.ResponseList?.NumberRangeResponse || [];
        if (!Array.isArray(list))
            list = [list];
        return { success: true, resolutions: list, data: result.data, message: opDesc };
    }
    /**
     * Enviar factura de prueba al API DIAN
     * POST /api/ubl2.1/invoice/{testSetId}
     */
    async sendInvoice(token, testSetId, invoiceData) {
        const result = await this.makeRequest(`/api/ubl2.1/invoice/${testSetId}`, 'POST', invoiceData, token);
        if (result.success && result.data) {
            const zipKey = result.data.ResponseDian?.Envelope?.Body?.SendTestSetAsyncResponse?.SendTestSetAsyncResult?.ZipKey
                || result.data.zipKey
                || result.data.ZipKey;
            return { success: true, zipKey, data: result.data, message: result.message };
        }
        return { success: false, message: result.message };
    }
    /**
     * Consultar estado de un ZipKey
     * POST /api/ubl2.1/status/zip/{zipKey}
     */
    async checkZipStatus(token, zipKey) {
        const result = await this.makeRequest(`/api/ubl2.1/status/zip/${zipKey}`, 'POST', { sendmail: false, sendmailtome: false, is_payroll: false, is_eqdoc: false }, token);
        if (result.success && result.data) {
            const statusCode = result.data.ResponseDian?.Envelope?.Body?.GetStatusZipResponse?.GetStatusZipResult?.DianResponse?.StatusCode
                || result.data.statusCode
                || result.data.StatusCode;
            const statusDescription = result.data.ResponseDian?.Envelope?.Body?.GetStatusZipResponse?.GetStatusZipResult?.DianResponse?.StatusDescription
                || result.data.statusDescription
                || result.data.StatusDescription
                || result.data.message;
            return {
                success: true,
                statusCode,
                statusDescription,
                data: result.data,
            };
        }
        return { success: false, message: result.message };
    }
    /**
     * Enviar nómina de prueba al API DIAN
     * POST /api/ubl2.1/payroll/{testSetId}
     */
    async sendPayroll(token, testSetId, payrollData) {
        const result = await this.makeRequest(`/api/ubl2.1/payroll/${testSetId}`, 'POST', payrollData, token);
        if (result.success && result.data) {
            const message = result.data.message || result.message || '';
            const cune = result.data.cune || result.data.CUNE;
            const nilAttr = result.data.ResponseDian?.Envelope?.Body
                ?.SendTestSetAsyncResponse?.SendTestSetAsyncResult?.ErrorMessageList?._attributes?.nil;
            const isSuccess = message.toLowerCase().includes('generada con éxito') && nilAttr === 'true';
            if (isSuccess) {
                return { success: true, cune, data: result.data, message };
            }
            return { success: false, message: message || 'Error en respuesta DIAN', data: result.data };
        }
        return { success: false, message: result.message };
    }
    /**
     * Enviar nota de ajuste de nómina al API DIAN
     * POST /api/ubl2.1/payroll-adjust-note/{testSetId}
     */
    async sendPayrollAdjustNote(token, testSetId, noteData) {
        const result = await this.makeRequest(`/api/ubl2.1/payroll-adjust-note/${testSetId}`, 'POST', noteData, token);
        if (result.success && result.data) {
            const message = result.data.message || result.message || '';
            const cune = result.data.cune || result.data.CUNE;
            const nilAttr = result.data.ResponseDian?.Envelope?.Body
                ?.SendTestSetAsyncResponse?.SendTestSetAsyncResult?.ErrorMessageList?._attributes?.nil;
            const isSuccess = message.toLowerCase().includes('generada con éxito') && nilAttr === 'true';
            if (isSuccess) {
                return { success: true, cune, data: result.data, message };
            }
            return { success: false, message: message || 'Error en respuesta DIAN', data: result.data };
        }
        return { success: false, message: result.message };
    }
};
exports.DianApiService = DianApiService;
/**
 * Campos grandes de la respuesta DIAN (XMLs en base64) que se excluyen del api_log
 */
DianApiService.EXCLUDED_RESPONSE_FIELDS = [
    // Facturación
    'invoicexml', 'reqfe', 'unsignedinvoicexml', 'zipinvoicexml', 'rptafe',
    // Nómina
    'payrollxml', 'reqni', 'unsignedpayrollxml', 'zippayrollxml', 'rptani',
    // Nota de ajuste nómina
    'payrolladjustnotexml', 'reqna', 'unsignedpayrolladjustnotexml', 'zippayrolladjustnotexml', 'rptana',
    // Nota crédito / débito
    'creditnotexml', 'reqnc', 'unsignedcreditnotexml', 'zipcreditnotexml', 'rptanc',
    'debitnotexml', 'reqnd', 'unsigneddebitnotexml', 'zipdebitnotexml', 'rptand',
];
exports.DianApiService = DianApiService = DianApiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], DianApiService);
