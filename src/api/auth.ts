import type { ApiResponse, LoginRequest, LoginResponse, UserInfo } from '../types/api';
import apiClient from './client';

/** POST /api/v1/auth/login */
export const login = (data: LoginRequest) =>
  apiClient.post<ApiResponse<LoginResponse>>('/api/v1/auth/login', data);

/** GET /api/v1/auth/me */
export const getMe = () =>
  apiClient.get<ApiResponse<UserInfo>>('/api/v1/auth/me');
