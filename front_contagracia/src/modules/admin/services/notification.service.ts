import { notificationsClient } from '@/shared/services/api/apiClient';
import type {
  SendBroadcastPayload,
  BroadcastResponse,
  BroadcastNotification,
  CompanyNotification,
} from '@/modules/admin/types';

export const notificationService = {
  sendBroadcast: async (
    payload: SendBroadcastPayload,
  ): Promise<BroadcastResponse> => {
    const { data } = await notificationsClient.post(
      '/notifications/broadcast',
      payload,
    );
    return data;
  },

  getBroadcasts: async (
    page = 1,
    limit = 20,
  ): Promise<{
    data: BroadcastNotification[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> => {
    const { data } = await notificationsClient.get(
      '/notifications/broadcasts',
      { params: { page, limit } },
    );
    return data;
  },

  // Company-facing endpoints
  getCompanyNotifications: async (
    companyId: string,
    page = 1,
    limit = 20,
    userId?: string,
  ): Promise<{
    data: CompanyNotification[];
    total: number;
    unread_count: number;
    page: number;
    limit: number;
    totalPages: number;
  }> => {
    const params: Record<string, unknown> = { page, limit };
    if (userId) params.user_id = userId;
    const { data } = await notificationsClient.get(
      `/notifications/company/${companyId}`,
      { params },
    );
    return data;
  },

  getUnreadCount: async (
    companyId: string,
    userId?: string,
  ): Promise<{ unread_count: number }> => {
    const params: Record<string, string> = {};
    if (userId) params.user_id = userId;
    const { data } = await notificationsClient.get(
      `/notifications/company/${companyId}/unread-count`,
      { params },
    );
    return data;
  },

  markAsRead: async (companyId: string, notificationId: string) => {
    const { data } = await notificationsClient.patch(
      `/notifications/company/${companyId}/${notificationId}/read`,
    );
    return data;
  },

  markAllAsRead: async (companyId: string, userId?: string) => {
    const params: Record<string, string> = {};
    if (userId) params.user_id = userId;
    const { data } = await notificationsClient.patch(
      `/notifications/company/${companyId}/read-all`,
      undefined,
      { params },
    );
    return data;
  },
};
