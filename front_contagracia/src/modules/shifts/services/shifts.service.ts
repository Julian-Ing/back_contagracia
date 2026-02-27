import { hrClient } from '@/shared/services/api/apiClient';
import type {
  ShiftTemplate,
  ShiftSchedule,
  ShiftAssignment,
  ShiftSwapRequest,
  CreateShiftTemplateDto,
  CreateScheduleDto,
  CreateAssignmentDto,
  QueryAssignmentsParams,
  QuerySwapsParams,
} from '../types';

export const shiftsService = {
  // ==================== TEMPLATES ====================
  async getTemplates(): Promise<{ data: ShiftTemplate[]; total: number }> {
    const response = await hrClient.get('/shifts/templates');
    return response.data;
  },

  async getTemplate(id: string): Promise<ShiftTemplate> {
    const response = await hrClient.get(`/shifts/templates/${id}`);
    return response.data;
  },

  async createTemplate(data: CreateShiftTemplateDto): Promise<{ message: string; template: ShiftTemplate }> {
    const response = await hrClient.post('/shifts/templates', data);
    return response.data;
  },

  async updateTemplate(id: string, data: Partial<CreateShiftTemplateDto>): Promise<{ message: string; template: ShiftTemplate }> {
    const response = await hrClient.patch(`/shifts/templates/${id}`, data);
    return response.data;
  },

  async deleteTemplate(id: string): Promise<{ message: string }> {
    const response = await hrClient.delete(`/shifts/templates/${id}`);
    return response.data;
  },

  // ==================== SCHEDULES ====================
  async getSchedules(): Promise<{ data: ShiftSchedule[]; total: number }> {
    const response = await hrClient.get('/shifts/schedules');
    return response.data;
  },

  async getSchedule(id: string): Promise<ShiftSchedule> {
    const response = await hrClient.get(`/shifts/schedules/${id}`);
    return response.data;
  },

  async createSchedule(data: CreateScheduleDto): Promise<{ message: string; schedule: ShiftSchedule }> {
    const response = await hrClient.post('/shifts/schedules', data);
    return response.data;
  },

  async updateSchedule(id: string, data: Partial<CreateScheduleDto>): Promise<{ message: string }> {
    const response = await hrClient.patch(`/shifts/schedules/${id}`, data);
    return response.data;
  },

  async publishSchedule(id: string): Promise<{ message: string }> {
    const response = await hrClient.patch(`/shifts/schedules/${id}/publish`);
    return response.data;
  },

  async deleteSchedule(id: string): Promise<{ message: string }> {
    const response = await hrClient.delete(`/shifts/schedules/${id}`);
    return response.data;
  },

  // ==================== ASSIGNMENTS ====================
  async getAssignments(params: QueryAssignmentsParams = {}): Promise<{ data: ShiftAssignment[]; total: number; page: number; limit: number }> {
    const queryParams: Record<string, string> = {};
    if (params.third_party_id) queryParams.third_party_id = params.third_party_id;
    if (params.shift_template_id) queryParams.shift_template_id = params.shift_template_id;
    if (params.schedule_id) queryParams.schedule_id = params.schedule_id;
    if (params.date_from) queryParams.date_from = params.date_from;
    if (params.date_to) queryParams.date_to = params.date_to;
    if (params.status) queryParams.status = params.status;
    if (params.page) queryParams.page = String(params.page);
    if (params.limit) queryParams.limit = String(params.limit);

    const response = await hrClient.get('/shifts/assignments', { params: queryParams });
    return response.data;
  },

  async createAssignment(data: CreateAssignmentDto): Promise<{ message: string; assignment: ShiftAssignment }> {
    const response = await hrClient.post('/shifts/assignments', data);
    return response.data;
  },

  async bulkCreateAssignments(data: { schedule_id?: string; assignments: CreateAssignmentDto[] }): Promise<{ message: string; created: number; errors: string[] }> {
    const response = await hrClient.post('/shifts/assignments/bulk', data);
    return response.data;
  },

  async updateAssignment(id: string, data: Partial<CreateAssignmentDto>): Promise<{ message: string }> {
    const response = await hrClient.patch(`/shifts/assignments/${id}`, data);
    return response.data;
  },

  async deleteAssignment(id: string): Promise<{ message: string }> {
    const response = await hrClient.delete(`/shifts/assignments/${id}`);
    return response.data;
  },

  // ==================== SWAPS ====================
  async getSwaps(params: QuerySwapsParams = {}): Promise<{ data: ShiftSwapRequest[]; total: number }> {
    const queryParams: Record<string, string> = {};
    if (params.status) queryParams.status = params.status;
    if (params.requester_id) queryParams.requester_id = params.requester_id;
    if (params.page) queryParams.page = String(params.page);
    if (params.limit) queryParams.limit = String(params.limit);

    const response = await hrClient.get('/shifts/swaps', { params: queryParams });
    return response.data;
  },

  async approveSwap(id: string): Promise<{ message: string }> {
    const response = await hrClient.patch(`/shifts/swaps/${id}/approve`);
    return response.data;
  },

  async rejectSwap(id: string, rejectionReason?: string): Promise<{ message: string }> {
    const response = await hrClient.patch(`/shifts/swaps/${id}/reject`, { rejection_reason: rejectionReason });
    return response.data;
  },

  // ==================== SELF-SERVICE ====================
  async getMyShifts(params: QueryAssignmentsParams = {}): Promise<{ data: ShiftAssignment[]; total: number }> {
    const queryParams: Record<string, string> = {};
    if (params.date_from) queryParams.date_from = params.date_from;
    if (params.date_to) queryParams.date_to = params.date_to;
    if (params.status) queryParams.status = params.status;
    if (params.page) queryParams.page = String(params.page);
    if (params.limit) queryParams.limit = String(params.limit);

    const response = await hrClient.get('/shifts/my-shifts', { params: queryParams });
    return response.data;
  },

  async confirmMyShift(id: string): Promise<{ message: string }> {
    const response = await hrClient.patch(`/shifts/my-shifts/${id}/confirm`);
    return response.data;
  },

  async requestSwap(data: { target_id: string; requester_assignment_id: string; target_assignment_id: string; reason?: string }): Promise<{ message: string }> {
    const response = await hrClient.post('/shifts/my-shifts/swap', data);
    return response.data;
  },

  async cancelMySwap(id: string): Promise<{ message: string }> {
    const response = await hrClient.patch(`/shifts/my-shifts/swap/${id}/cancel`);
    return response.data;
  },

  // ==================== EXPORT ====================
  async exportAssignments(params: QueryAssignmentsParams = {}): Promise<{ data: any[]; total: number }> {
    const queryParams: Record<string, string> = {};
    if (params.date_from) queryParams.date_from = params.date_from;
    if (params.date_to) queryParams.date_to = params.date_to;
    if (params.schedule_id) queryParams.schedule_id = params.schedule_id;

    const response = await hrClient.get('/shifts/export', { params: queryParams });
    return response.data;
  },
};
