import type { LoginRequest, LoginResponse, UserInfo } from '../types/api';
import apiClient from './client';

/** POST /api/v1/auth/login */
export const login = (data: LoginRequest) =>
  apiClient.post<LoginResponse>('/api/v1/auth/login', data);

/** GET /api/v1/auth/me */
export const getMe = () =>
  apiClient.get<UserInfo>('/api/v1/auth/me');
