import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { JobHangfireResumen, JobTemplate } from '../types/hangfire';

export const hangfireApi = {
  obtenerJobs: async (): Promise<JobHangfireResumen> => {
    const { data } = await apiClient.get<ApiResponse<JobHangfireResumen>>('/hangfire-admin/jobs');
    return data.data;
  },

  triggerJob: async (jobId: string): Promise<void> => {
    await apiClient.post(`/hangfire-admin/jobs/${encodeURIComponent(jobId)}/trigger`);
  },

  eliminarJob: async (jobId: string): Promise<void> => {
    await apiClient.delete(`/hangfire-admin/jobs/${encodeURIComponent(jobId)}`);
  },

  reRegistrarTodos: async (): Promise<{ procesados: number; errores: string[] }> => {
    const { data } = await apiClient.post<ApiResponse<{ procesados: number; errores: string[] }>>('/hangfire-admin/re-register-all');
    return data.data;
  },

  obtenerTemplates: async (): Promise<JobTemplate[]> => {
    const { data } = await apiClient.get<ApiResponse<JobTemplate[]>>('/hangfire-admin/job-templates');
    return data.data;
  },

  registrarJob: async (request: { tipoJobId: string; sucursal: string; destino?: string; cron: string }): Promise<{ jobId: string; cron: string }> => {
    const { data } = await apiClient.post<ApiResponse<{ jobId: string; cron: string }>>('/hangfire-admin/register', request);
    return data.data;
  },
};
