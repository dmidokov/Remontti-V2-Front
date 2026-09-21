import apiClient from '../api/client'
import { mockApiClient } from '../api/mockApiClient'
import { USE_MOCK } from '../config'
import { seedStore } from '../db'
import type {
  BranchItem,
  BranchesResponse,
  CreateBranchRequest,
  UpdateBranchRequest,
} from '../types/api'

/** Начальные точки для мок-режима (add-only по id). */
const INITIAL_BRANCHES: BranchItem[] = [
  {
    id: 1,
    name: 'Точка на Ленина',
    address: 'г. Казань, ул. Ленина, 12',
    phone: '+7 843 000-00-00',
  },
  {
    id: 2,
    name: 'Мастерская на Рабочей',
    address: 'г. Казань, ул. Рабочая, 15',
    phone: '',
  },
]

export async function seedBranches(): Promise<void> {
  await seedStore<BranchItem>('branches', INITIAL_BRANCHES)
}

export async function listBranches(): Promise<BranchesResponse> {
  return USE_MOCK ? mockApiClient.getBranches() : apiClient.getBranches()
}

export async function createBranch(data: CreateBranchRequest): Promise<BranchItem> {
  return USE_MOCK ? mockApiClient.createBranch(data) : apiClient.createBranch(data)
}

export async function updateBranch(id: number, data: UpdateBranchRequest): Promise<BranchItem> {
  return USE_MOCK ? mockApiClient.updateBranch(id, data) : apiClient.updateBranch(id, data)
}

export async function deleteBranch(id: number): Promise<void> {
  if (USE_MOCK) {
    await mockApiClient.deleteBranch(id)
    return
  }
  await apiClient.deleteBranch(id)
}
