import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";

export const workflowService = {
  createWorkflow: (payload) => api.post(API_ENDPOINTS.workflow.create, payload),
  addStep: (payload) => api.post(API_ENDPOINTS.workflow.addStep, payload),
  getAll: () => api.get(API_ENDPOINTS.workflow.list, { dedupe: false }),
  getSteps: (workflowId) =>
    api.get(API_ENDPOINTS.workflow.steps(workflowId), { dedupe: false }),
  getPending: (approverId) =>
    api.get(API_ENDPOINTS.workflow.pending(approverId), { dedupe: false }),
  getHistory: () => api.get(API_ENDPOINTS.workflow.history, { dedupe: false }),
  approve: (payload) => api.post(API_ENDPOINTS.workflow.approve, payload),
};
