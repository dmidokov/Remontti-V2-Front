import apiClient from '../api/client'
import { mockApiClient } from '../api/mockApiClient'
import { USE_MOCK } from '../config'
import type {
  Role,
  CreateRoleRequest,
  SetRolePermissionsRequest,
  GetRolesResponse,
  GetPermissionsResponse,
  SuccessResponse,
} from '../types/api'

export async function getRoles(domain?: string): Promise<GetRolesResponse> {
  return USE_MOCK
    ? mockApiClient.getRoles(domain)
    : apiClient.getRoles(domain)
}

export async function getPermissions(domain?: string): Promise<GetPermissionsResponse> {
  return USE_MOCK
    ? mockApiClient.getPermissions(domain)
    : apiClient.getPermissions(domain)
}

export async function createRole(data: CreateRoleRequest): Promise<Role> {
  return USE_MOCK
    ? mockApiClient.createRole(data)
    : apiClient.createRole(data)
}

export async function setRolePermissions(code: string, data: SetRolePermissionsRequest): Promise<Role> {
  return USE_MOCK
    ? mockApiClient.setRolePermissions(code, data)
    : apiClient.setRolePermissions(code, data)
}

export async function deleteRole(code: string): Promise<SuccessResponse> {
  return USE_MOCK
    ? mockApiClient.deleteRole(code)
    : apiClient.deleteRole(code)
}