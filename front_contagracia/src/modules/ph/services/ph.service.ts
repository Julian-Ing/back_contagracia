import { phClient, mediaClient } from '@/shared/services/api/apiClient';

const base = (companyId: string) => `/companies/${companyId}/ph`;

// ─── Condominiums ───
export const condominiumsService = {
  getAll: (companyId: string, params?: Record<string, unknown>) =>
    phClient.get(`${base(companyId)}/condominiums`, { params }).then(r => r.data),
  getOne: (companyId: string, id: string) =>
    phClient.get(`${base(companyId)}/condominiums/${id}`).then(r => r.data),
  create: (companyId: string, data: Record<string, unknown>) =>
    phClient.post(`${base(companyId)}/condominiums`, data).then(r => r.data),
  update: (companyId: string, id: string, data: Record<string, unknown>) =>
    phClient.patch(`${base(companyId)}/condominiums/${id}`, data).then(r => r.data),
  remove: (companyId: string, id: string) =>
    phClient.delete(`${base(companyId)}/condominiums/${id}`).then(r => r.data),
};

// ─── Towers ───
export const towersService = {
  getAll: (companyId: string, condominiumId: string) =>
    phClient.get(`${base(companyId)}/condominiums/${condominiumId}/towers`).then(r => r.data),
  create: (companyId: string, condominiumId: string, data: Record<string, unknown>) =>
    phClient.post(`${base(companyId)}/condominiums/${condominiumId}/towers`, data).then(r => r.data),
  update: (companyId: string, condominiumId: string, towerId: string, data: Record<string, unknown>) =>
    phClient.patch(`${base(companyId)}/condominiums/${condominiumId}/towers/${towerId}`, data).then(r => r.data),
  remove: (companyId: string, condominiumId: string, towerId: string) =>
    phClient.delete(`${base(companyId)}/condominiums/${condominiumId}/towers/${towerId}`).then(r => r.data),
};

// ─── Unit Types ───
export const unitTypesService = {
  getAll: (companyId: string, params?: Record<string, unknown>) =>
    phClient.get(`${base(companyId)}/unit-types`, { params }).then(r => r.data),
  getOne: (companyId: string, id: string) =>
    phClient.get(`${base(companyId)}/unit-types/${id}`).then(r => r.data),
  create: (companyId: string, data: Record<string, unknown>) =>
    phClient.post(`${base(companyId)}/unit-types`, data).then(r => r.data),
  update: (companyId: string, id: string, data: Record<string, unknown>) =>
    phClient.patch(`${base(companyId)}/unit-types/${id}`, data).then(r => r.data),
  remove: (companyId: string, id: string) =>
    phClient.delete(`${base(companyId)}/unit-types/${id}`).then(r => r.data),
};

// ─── Units ───
export const unitsService = {
  getAll: (companyId: string, params?: Record<string, unknown>) =>
    phClient.get(`${base(companyId)}/units`, { params }).then(r => r.data),
  getOne: (companyId: string, id: string) =>
    phClient.get(`${base(companyId)}/units/${id}`).then(r => r.data),
  create: (companyId: string, data: Record<string, unknown>) =>
    phClient.post(`${base(companyId)}/units`, data).then(r => r.data),
  update: (companyId: string, id: string, data: Record<string, unknown>) =>
    phClient.patch(`${base(companyId)}/units/${id}`, data).then(r => r.data),
  remove: (companyId: string, id: string) =>
    phClient.delete(`${base(companyId)}/units/${id}`).then(r => r.data),
  getCoefficientSum: (companyId: string, condominiumId: string, excludeUnitId?: string) =>
    phClient.get(`${base(companyId)}/units/coefficient-sum`, {
      params: { condominium_id: condominiumId, exclude_unit_id: excludeUnitId },
    }).then(r => r.data),
};

// ─── Residents ───
export const residentsService = {
  getAll: (companyId: string, params?: Record<string, unknown>) =>
    phClient.get(`${base(companyId)}/residents`, { params }).then(r => r.data),
  getOne: (companyId: string, id: string) =>
    phClient.get(`${base(companyId)}/residents/${id}`).then(r => r.data),
  create: (companyId: string, data: Record<string, unknown>) =>
    phClient.post(`${base(companyId)}/residents`, data).then(r => r.data),
  update: (companyId: string, id: string, data: Record<string, unknown>) =>
    phClient.patch(`${base(companyId)}/residents/${id}`, data).then(r => r.data),
  remove: (companyId: string, id: string) =>
    phClient.delete(`${base(companyId)}/residents/${id}`).then(r => r.data),
  /** Obtener unidades del usuario logueado (residente) */
  getMyUnits: (companyId: string) =>
    phClient.get(`${base(companyId)}/residents/my-units`).then(r => r.data),
};

// ─── Vehicles ───
export const vehiclesService = {
  getAll: (companyId: string, params?: Record<string, unknown>) =>
    phClient.get(`${base(companyId)}/vehicles`, { params }).then(r => r.data),
  getOne: (companyId: string, id: string) =>
    phClient.get(`${base(companyId)}/vehicles/${id}`).then(r => r.data),
  create: (companyId: string, data: Record<string, unknown>) =>
    phClient.post(`${base(companyId)}/vehicles`, data).then(r => r.data),
  update: (companyId: string, id: string, data: Record<string, unknown>) =>
    phClient.patch(`${base(companyId)}/vehicles/${id}`, data).then(r => r.data),
  remove: (companyId: string, id: string) =>
    phClient.delete(`${base(companyId)}/vehicles/${id}`).then(r => r.data),
};

// ─── Common Areas ───
export const commonAreasService = {
  getAll: (companyId: string, params?: Record<string, unknown>) =>
    phClient.get(`${base(companyId)}/common-areas`, { params }).then(r => r.data),
  getOne: (companyId: string, id: string) =>
    phClient.get(`${base(companyId)}/common-areas/${id}`).then(r => r.data),
  create: (companyId: string, data: Record<string, unknown>) =>
    phClient.post(`${base(companyId)}/common-areas`, data).then(r => r.data),
  update: (companyId: string, id: string, data: Record<string, unknown>) =>
    phClient.patch(`${base(companyId)}/common-areas/${id}`, data).then(r => r.data),
  remove: (companyId: string, id: string) =>
    phClient.delete(`${base(companyId)}/common-areas/${id}`).then(r => r.data),
};

// ─── Reservations ───
export const reservationsService = {
  getAll: (companyId: string, areaId: string, params?: Record<string, unknown>) =>
    phClient.get(`${base(companyId)}/common-areas/${areaId}/reservations`, { params }).then(r => r.data),
  checkAvailability: (companyId: string, areaId: string, params: { date: string; start_time: string; end_time: string }) =>
    phClient.get(`${base(companyId)}/common-areas/${areaId}/reservations/check-availability`, { params }).then(r => r.data),
  create: (companyId: string, areaId: string, data: Record<string, unknown>) =>
    phClient.post(`${base(companyId)}/common-areas/${areaId}/reservations`, data).then(r => r.data),
  confirm: (companyId: string, areaId: string, reservationId: string) =>
    phClient.patch(`${base(companyId)}/common-areas/${areaId}/reservations/${reservationId}/confirm`).then(r => r.data),
  cancel: (companyId: string, areaId: string, reservationId: string, data?: { cancellation_reason?: string }) =>
    phClient.patch(`${base(companyId)}/common-areas/${areaId}/reservations/${reservationId}/cancel`, data).then(r => r.data),
  complete: (companyId: string, areaId: string, reservationId: string) =>
    phClient.patch(`${base(companyId)}/common-areas/${areaId}/reservations/${reservationId}/complete`).then(r => r.data),
  getAllForCompany: (companyId: string, params?: Record<string, unknown>) =>
    phClient.get(`${base(companyId)}/common-areas/all-reservations`, { params }).then(r => r.data),
  reactivate: (companyId: string, areaId: string, reservationId: string) =>
    phClient.patch(`${base(companyId)}/common-areas/${areaId}/reservations/${reservationId}/reactivate`).then(r => r.data),
};

// ─── Fee Concepts ───
export const feeConceptsService = {
  getAll: (companyId: string, params?: Record<string, unknown>) =>
    phClient.get(`${base(companyId)}/fee-concepts`, { params }).then(r => r.data),
  getOne: (companyId: string, id: string) =>
    phClient.get(`${base(companyId)}/fee-concepts/${id}`).then(r => r.data),
  create: (companyId: string, data: Record<string, unknown>) =>
    phClient.post(`${base(companyId)}/fee-concepts`, data).then(r => r.data),
  update: (companyId: string, id: string, data: Record<string, unknown>) =>
    phClient.patch(`${base(companyId)}/fee-concepts/${id}`, data).then(r => r.data),
  remove: (companyId: string, id: string) =>
    phClient.delete(`${base(companyId)}/fee-concepts/${id}`).then(r => r.data),
};

// ─── Billing Periods ───
export const billingPeriodsService = {
  getAll: (companyId: string, params?: Record<string, unknown>) =>
    phClient.get(`${base(companyId)}/billing/periods`, { params }).then(r => r.data),
  getOne: (companyId: string, periodId: string) =>
    phClient.get(`${base(companyId)}/billing/periods/${periodId}`).then(r => r.data),
  create: (companyId: string, data: Record<string, unknown>) =>
    phClient.post(`${base(companyId)}/billing/periods`, data).then(r => r.data),
  update: (companyId: string, periodId: string, data: Record<string, unknown>) =>
    phClient.patch(`${base(companyId)}/billing/periods/${periodId}`, data).then(r => r.data),
  remove: (companyId: string, periodId: string) =>
    phClient.delete(`${base(companyId)}/billing/periods/${periodId}`).then(r => r.data),
  close: (companyId: string, periodId: string) =>
    phClient.patch(`${base(companyId)}/billing/periods/${periodId}/close`).then(r => r.data),
  generateFees: (companyId: string, periodId: string, data: { fee_concept_ids: string[]; condominium_id?: string }) =>
    phClient.post(`${base(companyId)}/billing/periods/${periodId}/generate-fees`, data).then(r => r.data),
  sendInvoices: (companyId: string, periodId: string) =>
    phClient.post(`${base(companyId)}/billing/periods/${periodId}/send-invoices`).then(r => r.data),
};

// ─── Fees ───
export const feesService = {
  getAll: (companyId: string, params?: Record<string, unknown>) =>
    phClient.get(`${base(companyId)}/billing/fees`, { params }).then(r => r.data),
  getOne: (companyId: string, feeId: string) =>
    phClient.get(`${base(companyId)}/billing/fees/${feeId}`).then(r => r.data),
  update: (companyId: string, feeId: string, data: Record<string, unknown>) =>
    phClient.patch(`${base(companyId)}/billing/fees/${feeId}`, data).then(r => r.data),
  remove: (companyId: string, feeId: string) =>
    phClient.delete(`${base(companyId)}/billing/fees/${feeId}`).then(r => r.data),
  downloadPdf: (companyId: string, feeId: string) =>
    phClient.get(`${base(companyId)}/billing/fees/${feeId}/pdf`, { responseType: 'blob' }).then(r => r.data),
};

// ─── Unit Statement PDF ───
export const unitStatementService = {
  downloadPdf: (companyId: string, unitId: string) =>
    phClient.get(`${base(companyId)}/billing/units/${unitId}/statement-pdf`, { responseType: 'blob' }).then(r => r.data),
};

// ─── Payments (Abonos) ───
export const paymentsService = {
  getAll: (companyId: string, feeId: string) =>
    phClient.get(`${base(companyId)}/billing/fees/${feeId}/payments`).then(r => r.data),
  create: (companyId: string, feeId: string, data: Record<string, unknown>) =>
    phClient.post(`${base(companyId)}/billing/fees/${feeId}/payments`, data).then(r => r.data),
};

// ─── Cartera ───
export const carteraService = {
  getSummary: (companyId: string, params?: Record<string, unknown>) =>
    phClient.get(`${base(companyId)}/billing/cartera/summary`, { params }).then(r => r.data),
};

// ─── Delinquent Units ───
export const delinquentService = {
  getDelinquentUnits: (companyId: string): Promise<{ unit_ids: string[] }> =>
    phClient.get(`${base(companyId)}/billing/delinquent-units`).then(r => r.data),
};

// ─── Billing Configs ───
export const billingConfigsService = {
  getAll: (companyId: string, params?: Record<string, unknown>) =>
    phClient.get(`${base(companyId)}/billing/configs`, { params }).then(r => r.data),
  getOne: (companyId: string, configId: string) =>
    phClient.get(`${base(companyId)}/billing/configs/${configId}`).then(r => r.data),
  create: (companyId: string, data: Record<string, unknown>) =>
    phClient.post(`${base(companyId)}/billing/configs`, data).then(r => r.data),
  update: (companyId: string, configId: string, data: Record<string, unknown>) =>
    phClient.patch(`${base(companyId)}/billing/configs/${configId}`, data).then(r => r.data),
  remove: (companyId: string, configId: string) =>
    phClient.delete(`${base(companyId)}/billing/configs/${configId}`).then(r => r.data),
  toggle: (companyId: string, configId: string) =>
    phClient.patch(`${base(companyId)}/billing/configs/${configId}/toggle`).then(r => r.data),
};

// ─── Rentals ───
export const rentalsService = {
  getAll: (companyId: string, params?: Record<string, unknown>) =>
    phClient.get(`${base(companyId)}/rentals`, { params }).then(r => r.data),
  getOne: (companyId: string, id: string) =>
    phClient.get(`${base(companyId)}/rentals/${id}`).then(r => r.data),
  create: (companyId: string, data: Record<string, unknown>) =>
    phClient.post(`${base(companyId)}/rentals`, data).then(r => r.data),
  update: (companyId: string, id: string, data: Record<string, unknown>) =>
    phClient.patch(`${base(companyId)}/rentals/${id}`, data).then(r => r.data),
  checkout: (companyId: string, id: string) =>
    phClient.patch(`${base(companyId)}/rentals/${id}/checkout`).then(r => r.data),
  cancel: (companyId: string, id: string) =>
    phClient.delete(`${base(companyId)}/rentals/${id}`).then(r => r.data),
  downloadReceipt: (companyId: string, id: string) =>
    phClient.get(`${base(companyId)}/rentals/${id}/receipt`, { responseType: 'blob' }).then(r => r.data),
};

// ─── Insurance Policies ───
export const insurancePoliciesService = {
  getAll: (companyId: string, params?: Record<string, unknown>) =>
    phClient.get(`${base(companyId)}/insurance-policies`, { params }).then(r => r.data),
  getOne: (companyId: string, id: string) =>
    phClient.get(`${base(companyId)}/insurance-policies/${id}`).then(r => r.data),
  create: (companyId: string, data: Record<string, unknown>) =>
    phClient.post(`${base(companyId)}/insurance-policies`, data).then(r => r.data),
  update: (companyId: string, id: string, data: Record<string, unknown>) =>
    phClient.patch(`${base(companyId)}/insurance-policies/${id}`, data).then(r => r.data),
  remove: (companyId: string, id: string) =>
    phClient.delete(`${base(companyId)}/insurance-policies/${id}`).then(r => r.data),
  // Insurer history (N:M)
  getInsurers: (companyId: string, policyId: string) =>
    phClient.get(`${base(companyId)}/insurance-policies/${policyId}/insurers`).then(r => r.data),
  addInsurer: (companyId: string, policyId: string, data: Record<string, unknown>) =>
    phClient.post(`${base(companyId)}/insurance-policies/${policyId}/insurers`, data).then(r => r.data),
  removeInsurer: (companyId: string, insurerId: string) =>
    phClient.delete(`${base(companyId)}/insurance-policies/insurers/${insurerId}`).then(r => r.data),
};

// ─── Maintenance Plans ───
export const maintenancePlansService = {
  getAll: (companyId: string, params?: Record<string, unknown>) =>
    phClient.get(`${base(companyId)}/maintenance-plans`, { params }).then(r => r.data),
  getOne: (companyId: string, id: string) =>
    phClient.get(`${base(companyId)}/maintenance-plans/${id}`).then(r => r.data),
  create: (companyId: string, data: Record<string, unknown>) =>
    phClient.post(`${base(companyId)}/maintenance-plans`, data).then(r => r.data),
  update: (companyId: string, id: string, data: Record<string, unknown>) =>
    phClient.patch(`${base(companyId)}/maintenance-plans/${id}`, data).then(r => r.data),
  remove: (companyId: string, id: string) =>
    phClient.delete(`${base(companyId)}/maintenance-plans/${id}`).then(r => r.data),
  // Maintenance logs
  getLogs: (companyId: string, planId: string) =>
    phClient.get(`${base(companyId)}/maintenance-plans/${planId}/logs`).then(r => r.data),
  addLog: (companyId: string, planId: string, data: Record<string, unknown>) =>
    phClient.post(`${base(companyId)}/maintenance-plans/${planId}/logs`, data).then(r => r.data),
  updateLog: (companyId: string, planId: string, logId: string, data: Record<string, unknown>) =>
    phClient.patch(`${base(companyId)}/maintenance-plans/${planId}/logs/${logId}`, data).then(r => r.data),
  removeLog: (companyId: string, logId: string) =>
    phClient.delete(`${base(companyId)}/maintenance-plans/logs/${logId}`).then(r => r.data),
};

// ─── Document Categories ───
export const documentCategoriesService = {
  getAll: (companyId: string, params?: Record<string, unknown>) =>
    phClient.get(`${base(companyId)}/document-categories`, { params }).then(r => r.data),
  create: (companyId: string, data: Record<string, unknown>) =>
    phClient.post(`${base(companyId)}/document-categories`, data).then(r => r.data),
  update: (companyId: string, id: string, data: Record<string, unknown>) =>
    phClient.patch(`${base(companyId)}/document-categories/${id}`, data).then(r => r.data),
  remove: (companyId: string, id: string) =>
    phClient.delete(`${base(companyId)}/document-categories/${id}`).then(r => r.data),
  seedDefaults: (companyId: string) =>
    phClient.post(`${base(companyId)}/document-categories/seed`).then(r => r.data),
};

// ─── Documents ───
export const documentsService = {
  getAll: (companyId: string, params?: Record<string, unknown>) =>
    phClient.get(`${base(companyId)}/documents`, { params }).then(r => r.data),
  getByCondominium: (companyId: string, condominiumId: string) =>
    phClient.get(`${base(companyId)}/documents/by-condominium/${condominiumId}`).then(r => r.data),
  getOne: (companyId: string, id: string) =>
    phClient.get(`${base(companyId)}/documents/${id}`).then(r => r.data),
  create: (companyId: string, data: Record<string, unknown>) =>
    phClient.post(`${base(companyId)}/documents`, data).then(r => r.data),
  update: (companyId: string, id: string, data: Record<string, unknown>) =>
    phClient.patch(`${base(companyId)}/documents/${id}`, data).then(r => r.data),
  remove: (companyId: string, id: string) =>
    phClient.delete(`${base(companyId)}/documents/${id}`).then(r => r.data),
};

// ─── Media (upload centralizado) ───
export const mediaService = {
  upload: (formData: FormData) =>
    mediaClient.post('/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),

  /** Descarga un archivo autenticado y dispara descarga en el navegador */
  download: async (mediaPath: string, fileName?: string) => {
    // mediaPath = "/api/media/<uuid>" — mediaClient ya tiene baseURL con /api
    const url = mediaPath.startsWith('/api/') ? mediaPath.replace(/^\/api/, '') : mediaPath;
    const res = await mediaClient.get(url, { responseType: 'blob' });
    const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName || 'archivo';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  },
};

// ─── Assemblies ───
export const assembliesService = {
  getAll: (companyId: string, params?: Record<string, unknown>) =>
    phClient.get(`${base(companyId)}/assemblies`, { params }).then(r => r.data),
  getOne: (companyId: string, id: string) =>
    phClient.get(`${base(companyId)}/assemblies/${id}`).then(r => r.data),
  create: (companyId: string, data: Record<string, unknown>) =>
    phClient.post(`${base(companyId)}/assemblies`, data).then(r => r.data),
  update: (companyId: string, id: string, data: Record<string, unknown>) =>
    phClient.patch(`${base(companyId)}/assemblies/${id}`, data).then(r => r.data),
  remove: (companyId: string, id: string) =>
    phClient.delete(`${base(companyId)}/assemblies/${id}`).then(r => r.data),
  changeStatus: (companyId: string, id: string, status: string) =>
    phClient.patch(`${base(companyId)}/assemblies/${id}/status`, { status }).then(r => r.data),
  getQrCode: (companyId: string, id: string) =>
    phClient.get(`${base(companyId)}/assemblies/${id}/qr`).then(r => r.data),
  // Attendance
  getAttendances: (companyId: string, assemblyId: string) =>
    phClient.get(`${base(companyId)}/assemblies/${assemblyId}/attendances`).then(r => r.data),
  getAttendanceStats: (companyId: string, assemblyId: string) =>
    phClient.get(`${base(companyId)}/assemblies/${assemblyId}/attendances/stats`).then(r => r.data),
  registerAttendance: (companyId: string, assemblyId: string, data: Record<string, unknown>) =>
    phClient.post(`${base(companyId)}/assemblies/${assemblyId}/attendances`, data).then(r => r.data),
  removeAttendance: (companyId: string, assemblyId: string, attId: string) =>
    phClient.delete(`${base(companyId)}/assemblies/${assemblyId}/attendances/${attId}`).then(r => r.data),
  exportAttendanceExcel: (companyId: string, assemblyId: string) =>
    phClient.get(`${base(companyId)}/assemblies/${assemblyId}/attendances/export`, { responseType: 'blob' }).then(r => r.data),
  // Votes
  createVote: (companyId: string, assemblyId: string, data: Record<string, unknown>) =>
    phClient.post(`${base(companyId)}/assemblies/${assemblyId}/votes`, data).then(r => r.data),
  updateVote: (companyId: string, voteId: string, data: Record<string, unknown>) =>
    phClient.patch(`${base(companyId)}/assemblies/votes/${voteId}`, data).then(r => r.data),
  openVote: (companyId: string, voteId: string) =>
    phClient.patch(`${base(companyId)}/assemblies/votes/${voteId}/open`).then(r => r.data),
  closeVote: (companyId: string, voteId: string) =>
    phClient.patch(`${base(companyId)}/assemblies/votes/${voteId}/close`).then(r => r.data),
  castVote: (companyId: string, voteId: string, data: Record<string, unknown>) =>
    phClient.post(`${base(companyId)}/assemblies/votes/${voteId}/cast`, data).then(r => r.data),
  getVoteResults: (companyId: string, voteId: string) =>
    phClient.get(`${base(companyId)}/assemblies/votes/${voteId}/results`).then(r => r.data),
  exportVotesExcel: (companyId: string, assemblyId: string) =>
    phClient.get(`${base(companyId)}/assemblies/${assemblyId}/votes/export`, { responseType: 'blob' }).then(r => r.data),
};

// ─── PQRS ───
export const pqrsService = {
  getAll: (companyId: string, params?: Record<string, unknown>) =>
    phClient.get(`${base(companyId)}/pqrs`, { params }).then(r => r.data),
  getStats: (companyId: string, params?: Record<string, unknown>) =>
    phClient.get(`${base(companyId)}/pqrs/stats`, { params }).then(r => r.data),
  getOne: (companyId: string, id: string) =>
    phClient.get(`${base(companyId)}/pqrs/${id}`).then(r => r.data),
  create: (companyId: string, data: Record<string, unknown>) =>
    phClient.post(`${base(companyId)}/pqrs`, data).then(r => r.data),
  update: (companyId: string, id: string, data: Record<string, unknown>) =>
    phClient.patch(`${base(companyId)}/pqrs/${id}`, data).then(r => r.data),
  changeStatus: (companyId: string, id: string, status: string) =>
    phClient.patch(`${base(companyId)}/pqrs/${id}/status`, { status }).then(r => r.data),
  remove: (companyId: string, id: string) =>
    phClient.delete(`${base(companyId)}/pqrs/${id}`).then(r => r.data),
  getMessages: (companyId: string, pqrsId: string) =>
    phClient.get(`${base(companyId)}/pqrs/${pqrsId}/messages`).then(r => r.data),
  addMessage: (companyId: string, pqrsId: string, data: Record<string, unknown>) =>
    phClient.post(`${base(companyId)}/pqrs/${pqrsId}/messages`, data).then(r => r.data),
};

// ─── Comunicados ───
export const comunicadosService = {
  getAll: (companyId: string, params?: Record<string, unknown>) =>
    phClient.get(`${base(companyId)}/comunicados`, { params }).then(r => r.data),
  getStats: (companyId: string, params?: Record<string, unknown>) =>
    phClient.get(`${base(companyId)}/comunicados/stats`, { params }).then(r => r.data),
  getOne: (companyId: string, id: string) =>
    phClient.get(`${base(companyId)}/comunicados/${id}`).then(r => r.data),
  create: (companyId: string, data: Record<string, unknown>) =>
    phClient.post(`${base(companyId)}/comunicados`, data).then(r => r.data),
  update: (companyId: string, id: string, data: Record<string, unknown>) =>
    phClient.patch(`${base(companyId)}/comunicados/${id}`, data).then(r => r.data),
  send: (companyId: string, id: string) =>
    phClient.post(`${base(companyId)}/comunicados/${id}/send`).then(r => r.data),
  remove: (companyId: string, id: string) =>
    phClient.delete(`${base(companyId)}/comunicados/${id}`).then(r => r.data),
  previewRecipients: (companyId: string, condominiumId: string, roles: string[]) =>
    phClient.get(`${base(companyId)}/comunicados/preview-recipients`, {
      params: { condominium_id: condominiumId, roles: roles.join(',') },
    }).then(r => r.data),
};

// ─── Portería ───
export const porteriaService = {
  // Access logs
  getAccessLogs: (companyId: string, params?: Record<string, unknown>) =>
    phClient.get(`${base(companyId)}/porteria/access-logs`, { params }).then(r => r.data),
  createAccessLog: (companyId: string, data: Record<string, unknown>) =>
    phClient.post(`${base(companyId)}/porteria/access-logs`, data).then(r => r.data),
  registerExit: (companyId: string, id: string) =>
    phClient.patch(`${base(companyId)}/porteria/access-logs/${id}/exit`).then(r => r.data),
  deleteAccessLog: (companyId: string, id: string) =>
    phClient.delete(`${base(companyId)}/porteria/access-logs/${id}`).then(r => r.data),

  // Packages
  getPackages: (companyId: string, params?: Record<string, unknown>) =>
    phClient.get(`${base(companyId)}/porteria/packages`, { params }).then(r => r.data),
  getPackageStats: (companyId: string, params?: Record<string, unknown>) =>
    phClient.get(`${base(companyId)}/porteria/packages/stats`, { params }).then(r => r.data),
  createPackage: (companyId: string, data: Record<string, unknown>) =>
    phClient.post(`${base(companyId)}/porteria/packages`, data).then(r => r.data),
  deliverPackage: (companyId: string, id: string) =>
    phClient.patch(`${base(companyId)}/porteria/packages/${id}/deliver`).then(r => r.data),
  deletePackage: (companyId: string, id: string) =>
    phClient.delete(`${base(companyId)}/porteria/packages/${id}`).then(r => r.data),

  // Minuta
  getMinuta: (companyId: string, params?: Record<string, unknown>) =>
    phClient.get(`${base(companyId)}/porteria/minuta`, { params }).then(r => r.data),
  createMinutaEntry: (companyId: string, data: Record<string, unknown>) =>
    phClient.post(`${base(companyId)}/porteria/minuta`, data).then(r => r.data),
  updateMinutaEntry: (companyId: string, id: string, data: Record<string, unknown>) =>
    phClient.patch(`${base(companyId)}/porteria/minuta/${id}`, data).then(r => r.data),
  deleteMinutaEntry: (companyId: string, id: string) =>
    phClient.delete(`${base(companyId)}/porteria/minuta/${id}`).then(r => r.data),
};

// ─── Dashboard ───
export const dashboardService = {
  getStats: (companyId: string, params?: { condominium_id?: string }) =>
    phClient.get(`${base(companyId)}/dashboard/stats`, { params }).then(r => r.data),
};
