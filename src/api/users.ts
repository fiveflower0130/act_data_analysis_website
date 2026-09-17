import type { ApiResponse, UserListItem, UserListParams } from '../types/api';
import apiClient from './client';

/** GET /api/v1/users */
export const getUsers = (params: UserListParams = {}) =>
  apiClient.get<ApiResponse<UserListItem[]>>('/api/v1/users', { params });
