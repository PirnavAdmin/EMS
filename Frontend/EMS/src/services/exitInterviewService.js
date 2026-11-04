import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
export const createExitInterview = payload => api.post(API_ENDPOINTS.exitInterview.create,{resignationId:Number(payload.resignationId),conductedBy:String(payload.conductedBy??""),reasonForLeaving:String(payload.reasonForLeaving??""),feedback:String(payload.feedback??""),suggestions:String(payload.suggestions??""),interviewDate:payload.interviewDate?.length===10?`${payload.interviewDate}T00:00:00.000Z`:payload.interviewDate});
export const getExitInterviews = () => api.get(API_ENDPOINTS.exitInterview.list);
export const getExitInterviewByResignation = id => api.get(API_ENDPOINTS.exitInterview.byResignation(id));
export const deleteExitInterview = id => api.delete(API_ENDPOINTS.exitInterview.delete(id));
