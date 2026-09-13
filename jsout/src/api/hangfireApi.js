import { apiClient } from './client';
export const hangfireApi = {
    obtenerJobs: async () => {
        const { data } = await apiClient.get('/hangfire-admin/jobs');
        return data.data;
    },
    triggerJob: async (jobId) => {
        await apiClient.post(`/hangfire-admin/jobs/${encodeURIComponent(jobId)}/trigger`);
    },
    eliminarJob: async (jobId) => {
        await apiClient.delete(`/hangfire-admin/jobs/${encodeURIComponent(jobId)}`);
    },
    reRegistrarTodos: async () => {
        const { data } = await apiClient.post('/hangfire-admin/re-register-all');
        return data.data;
    },
    obtenerTemplates: async () => {
        const { data } = await apiClient.get('/hangfire-admin/job-templates');
        return data.data;
    },
    registrarJob: async (request) => {
        const { data } = await apiClient.post('/hangfire-admin/register', request);
        return data.data;
    },
};
