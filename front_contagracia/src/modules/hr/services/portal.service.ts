import { hrClient } from '@/shared/services/api/apiClient';

export interface PortalProfile {
  id: string;
  full_name: string;
  document_type: string | null;
  document: string | null;
  email: string | null;
  phone: string | null;
  position: string | null;
  start_date: string | null;
  is_active: boolean | null;
  salary: number | null;
  salary_type: string | null;
  contract_type: string | null;
  worker_type_code: string | null;
}

export interface PortalContract {
  contract: {
    id: string;
    contract_type: string;
    start_date: string;
    end_date: string | null;
    base_salary: number;
    salary_type: string;
    trial_end_date: string | null;
    worker_type_code: string | null;
    notes: string | null;
  } | null;
  message?: string;
}

export interface PortalLeave {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  status: string;
  reason: string | null;
  notes: string | null;
  created_at: string;
}

export interface PortalLeavesResponse {
  data: PortalLeave[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PortalPayslipSummary {
  id: string;
  third_party_id: string;
  net_salary: number;
  total_accrued: number;
  total_deductions: number;
  status: string;
  settlement: {
    id: string;
    settlement_name: string;
    settlement_number: string | null;
    settlement_type: string;
    start_date: string;
    end_date: string;
    payment_date: string | null;
    status: string;
    year: number;
    month: number;
  };
}

export interface PortalPayslipsResponse {
  data: PortalPayslipSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const portalService = {
  async getProfile(): Promise<PortalProfile> {
    const res = await hrClient.get<PortalProfile>('/portal/me/profile');
    return res.data;
  },

  async getContract(): Promise<PortalContract> {
    const res = await hrClient.get<PortalContract>('/portal/me/contract');
    return res.data;
  },

  async getLeaves(params: { status?: string; year?: number; page?: number; limit?: number } = {}): Promise<PortalLeavesResponse> {
    const query: Record<string, string> = {};
    if (params.status) query.status = params.status;
    if (params.year) query.year = String(params.year);
    if (params.page) query.page = String(params.page);
    if (params.limit) query.limit = String(params.limit);
    const res = await hrClient.get<PortalLeavesResponse>('/portal/me/leaves', { params: query });
    return res.data;
  },

  async getPayslips(params: { year?: number; month?: number; page?: number; limit?: number } = {}): Promise<PortalPayslipsResponse> {
    const query: Record<string, string> = {};
    if (params.year) query.year = String(params.year);
    if (params.month) query.month = String(params.month);
    if (params.page) query.page = String(params.page);
    if (params.limit) query.limit = String(params.limit);
    const res = await hrClient.get<PortalPayslipsResponse>('/portal/me/payslips', { params: query });
    return res.data;
  },

  async getPayslipDetail(detailId: string): Promise<any> {
    const res = await hrClient.get<any>(`/portal/me/payslips/${detailId}`);
    return res.data;
  },
};
