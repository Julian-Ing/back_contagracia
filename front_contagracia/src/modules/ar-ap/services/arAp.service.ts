import { accountingClient } from '@/shared/services/api/apiClient';
import type {
  ArApSummaryResponse,
  ArApSummaryFilters,
  ArApDetailResponse,
  ArApDetailFilters,
  PaymentReceiptsResponse,
  PaymentReceiptsFilters,
  ThirdPartyPaymentsResponse,
  ArApSourceItem,
} from '../types';

export const arApService = {
  /**
   * Lista de tipos de documento (ar_ap_sources)
   */
  async getSources(): Promise<ArApSourceItem[]> {
    const response = await accountingClient.get<ArApSourceItem[]>('/ar-ap/sources');
    return response.data;
  },

  /**
   * Resumen de saldos agrupado por tercero (cliente o proveedor)
   */
  async getSummaryByThirdParty(filters: ArApSummaryFilters): Promise<ArApSummaryResponse> {
    const params: Record<string, string> = { type: filters.type };
    if (filters.search) params.search = filters.search;
    if (filters.bucket && filters.bucket !== 'all') params.bucket = filters.bucket;
    if (filters.tab && filters.tab !== 'all') params.tab = filters.tab;
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
    if (filters.dueDateFrom) params.dueDateFrom = filters.dueDateFrom;
    if (filters.dueDateTo) params.dueDateTo = filters.dueDateTo;
    if (filters.page) params.page = String(filters.page);
    if (filters.limit) params.limit = String(filters.limit);

    const response = await accountingClient.get<ArApSummaryResponse>('/ar-ap/summary-by-third-party', { params });
    return response.data;
  },

  /**
   * Detalle de documentos y pagos de un tercero
   */
  async getThirdPartyDetail(thirdPartyId: string, filters: ArApDetailFilters): Promise<ArApDetailResponse> {
    const params: Record<string, string> = { type: filters.type };
    if (filters.search) params.search = filters.search;
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
    if (filters.dueDateFrom) params.dueDateFrom = filters.dueDateFrom;
    if (filters.dueDateTo) params.dueDateTo = filters.dueDateTo;
    if (filters.page) params.page = String(filters.page);
    if (filters.limit) params.limit = String(filters.limit);
    if (filters.statuses && filters.statuses.length > 0) params.statuses = filters.statuses.join(',');
    if (filters.overdue && filters.overdue !== 'all') params.overdue = filters.overdue;

    const response = await accountingClient.get<ArApDetailResponse>(
      `/ar-ap/third-party/${thirdPartyId}/detail`,
      { params },
    );
    return response.data;
  },

  /**
   * Pagos de un tercero — paginados con filtros
   */
  async getThirdPartyPayments(thirdPartyId: string, filters: {
    type: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    sourceKey?: string;
    paymentMethodId?: string;
    page?: number;
    limit?: number;
  }): Promise<ThirdPartyPaymentsResponse> {
    const params: Record<string, string> = { type: filters.type };
    if (filters.search) params.search = filters.search;
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
    if (filters.sourceKey) params.sourceKey = filters.sourceKey;
    if (filters.paymentMethodId) params.paymentMethodId = filters.paymentMethodId;
    if (filters.page) params.page = String(filters.page);
    if (filters.limit) params.limit = String(filters.limit);

    const response = await accountingClient.get<ThirdPartyPaymentsResponse>(
      `/ar-ap/third-party/${thirdPartyId}/payments`,
      { params },
    );
    return response.data;
  },

  /**
   * Listado de recibos de caja / comprobantes de egreso
   */
  async getPaymentReceipts(filters: PaymentReceiptsFilters): Promise<PaymentReceiptsResponse> {
    const params: Record<string, string> = { type: filters.type };
    if (filters.exclude_types) params.exclude_types = filters.exclude_types;
    if (filters.search) params.search = filters.search;
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
    if (filters.page) params.page = String(filters.page);
    if (filters.limit) params.limit = String(filters.limit);

    const response = await accountingClient.get<PaymentReceiptsResponse>('/ar-ap/payment-receipts', { params });
    return response.data;
  },
};
