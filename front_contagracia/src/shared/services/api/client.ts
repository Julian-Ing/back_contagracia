/**
 * API Client - Axios configuration
 * Handles all HTTP requests to NestJS microservices
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { env } from '@/config/env';
import type { ApiError, ApiResponse } from '@/shared/types';

// Create base axios instance
const createApiClient = (baseURL: string): AxiosInstance => {
  const instance = axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor - Add auth token
  instance.interceptors.request.use(
    (config) => {
      // Get token from localStorage
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor - Handle errors
  instance.interceptors.response.use(
    (response) => {
      return response;
    },
    async (error: AxiosError<ApiError>) => {
      // Handle 401 - Unauthorized (token expired)
      if (error.response?.status === 401) {
        // Try to refresh token
        if (typeof window !== 'undefined') {
          const refreshToken = localStorage.getItem('refresh_token');
          if (refreshToken) {
            try {
              const response = await authClient.post('/auth/refresh', {
                refresh_token: refreshToken,
              });
              
              const { access_token, refresh_token: newRefreshToken } = response.data;
              
              // Update tokens
              localStorage.setItem('access_token', access_token);
              localStorage.setItem('refresh_token', newRefreshToken);
              
              // Retry original request
              if (error.config) {
                error.config.headers.Authorization = `Bearer ${access_token}`;
                return instance.request(error.config);
              }
            } catch (refreshError) {
              // Refresh failed - Clear tokens and redirect to login
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              if (typeof window !== 'undefined') {
                window.location.href = '/';
              }
            }
          } else {
            // No refresh token - Redirect to login
            localStorage.removeItem('access_token');
            if (typeof window !== 'undefined') {
              window.location.href = '/';
            }
          }
        }
      }

      // Handle other errors
      const apiError: ApiError = {
        message: error.response?.data?.message || error.message || 'Error desconocido',
        statusCode: error.response?.status || 500,
        error: error.response?.data?.error,
        errors: error.response?.data?.errors,
      };

      return Promise.reject(apiError);
    }
  );

  return instance;
};

// Create clients for each microservice
export const authClient = createApiClient(env.authServiceUrl);
export const companyClient = createApiClient(env.companyServiceUrl);
export const inventoryClient = createApiClient(env.inventoryServiceUrl);
export const salesClient = createApiClient(env.salesServiceUrl);
export const accountingClient = createApiClient(env.accountingServiceUrl);
export const adminClient = createApiClient(env.adminServiceUrl);

// Generic API methods
export const apiClient = {
  get: <T = any>(url: string, config?: AxiosRequestConfig) =>
    authClient.get<ApiResponse<T>>(url, config).then((res) => res.data),

  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    authClient.post<ApiResponse<T>>(url, data, config).then((res) => res.data),

  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    authClient.put<ApiResponse<T>>(url, data, config).then((res) => res.data),

  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    authClient.patch<ApiResponse<T>>(url, data, config).then((res) => res.data),

  delete: <T = any>(url: string, config?: AxiosRequestConfig) =>
    authClient.delete<ApiResponse<T>>(url, config).then((res) => res.data),
};
